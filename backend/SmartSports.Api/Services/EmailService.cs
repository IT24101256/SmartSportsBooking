using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SmartSportsFacilityBooking.Services;

/// <summary>
/// Enterprise-grade transactional email service.
/// Supports:
/// 1. Resend REST API (HTTPS port 443) - Recommended for Render Free tier & cloud platforms where outbound SMTP is blocked.
/// 2. Brevo REST API (HTTPS port 443) - Alternative zero-port-blocking cloud email provider.
/// 3. Direct SMTP (Gmail, SendGrid, Outlook, custom) with automatic port 587 <-> 465 failover.
/// </summary>
public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly IHttpClientFactory? _httpClientFactory;

    public record EmailConfig(
        string Host,
        int Port,
        string? FromAddress,
        string? User,
        string? Password,
        string FromName,
        bool IgnoreCertErrors,
        string? ResendApiKey,
        string? BrevoApiKey);

    public EmailService(
        IConfiguration config,
        ILogger<EmailService> logger,
        IHttpClientFactory? httpClientFactory = null)
    {
        _config = config;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public EmailConfig GetConfig()
    {
        var resendApiKey = (Environment.GetEnvironmentVariable("RESEND_API_KEY")
            ?? _config["Resend:ApiKey"])?.Trim();

        var brevoApiKey = (Environment.GetEnvironmentVariable("BREVO_API_KEY")
            ?? _config["Brevo:ApiKey"])?.Trim();

        var host = (Environment.GetEnvironmentVariable("SMTP_HOST")
            ?? _config["Smtp:Host"]
            ?? "smtp.gmail.com").Trim();

        var portStr = (Environment.GetEnvironmentVariable("SMTP_PORT")
            ?? _config["Smtp:Port"]
            ?? "587").Trim();
        int.TryParse(portStr, out var port);
        if (port <= 0) port = 587;

        var from = (Environment.GetEnvironmentVariable("SMTP_FROM")
            ?? _config["Smtp:From"])?.Trim();

        var user = (Environment.GetEnvironmentVariable("SMTP_USER")
            ?? Environment.GetEnvironmentVariable("SMTP_USERNAME")
            ?? _config["Smtp:User"]
            ?? _config["Smtp:Username"]
            ?? from)?.Trim();

        var password = (Environment.GetEnvironmentVariable("SMTP_PASSWORD")
            ?? _config["Smtp:Password"])?.Trim();

        var fromName = (Environment.GetEnvironmentVariable("SMTP_FROM_NAME")
            ?? _config["Smtp:FromName"]
            ?? "MySpot Sports").Trim();

        var ignoreCertStr = Environment.GetEnvironmentVariable("SMTP_IGNORE_CERT_ERRORS")
            ?? _config["Smtp:IgnoreCertErrors"]
            ?? "false";
        var ignoreCert = !string.Equals(ignoreCertStr, "false", StringComparison.OrdinalIgnoreCase);

        // Remove whitespace from Google App Passwords if using Gmail
        if (!string.IsNullOrWhiteSpace(password) && host.Contains("gmail", StringComparison.OrdinalIgnoreCase))
        {
            password = password.Replace(" ", "");
        }

        return new EmailConfig(
            host,
            port,
            string.IsNullOrWhiteSpace(from) ? null : from,
            string.IsNullOrWhiteSpace(user) ? null : user,
            string.IsNullOrWhiteSpace(password) ? null : password,
            fromName,
            ignoreCert,
            string.IsNullOrWhiteSpace(resendApiKey) ? null : resendApiKey,
            string.IsNullOrWhiteSpace(brevoApiKey) ? null : brevoApiKey);
    }

    // Retained for backwards-compatibility with existing controllers and status endpoints
    public (string host, int port, string? from, string? password, string fromName, bool ignoreCertErrors) GetSmtpConfig()
    {
        var cfg = GetConfig();
        return (cfg.Host, cfg.Port, cfg.FromAddress, cfg.Password, cfg.FromName, cfg.IgnoreCertErrors);
    }

    public bool IsSmtpConfigured
    {
        get
        {
            var cfg = GetConfig();
            return !string.IsNullOrWhiteSpace(cfg.FromAddress) && !string.IsNullOrWhiteSpace(cfg.Password);
        }
    }

    public bool IsConfigured
    {
        get
        {
            var cfg = GetConfig();
            return !string.IsNullOrWhiteSpace(cfg.ResendApiKey)
                || !string.IsNullOrWhiteSpace(cfg.BrevoApiKey)
                || IsSmtpConfigured;
        }
    }

    public string ActiveProviderName
    {
        get
        {
            var cfg = GetConfig();
            if (!string.IsNullOrWhiteSpace(cfg.ResendApiKey)) return "Resend HTTP API (Port 443 HTTPS)";
            if (!string.IsNullOrWhiteSpace(cfg.BrevoApiKey)) return "Brevo HTTP API (Port 443 HTTPS)";
            if (IsSmtpConfigured) return $"SMTP ({cfg.Host}:{cfg.Port})";
            return "None (Unconfigured)";
        }
    }

    private HttpClient CreateHttpClient()
    {
        return _httpClientFactory?.CreateClient("EmailClient") ?? new HttpClient();
    }

    /// <summary>
    /// Delivers an email using the best available configured provider (Resend API -> Brevo API -> MailKit SMTP).
    /// </summary>
    public async Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string plainText, string htmlBody)
    {
        var config = GetConfig();

        if (!IsConfigured)
        {
            _logger.LogWarning("[EMAIL] No email provider configured (missing RESEND_API_KEY and SMTP credentials). Skipping real email to {Email}.", toEmail);
            return false;
        }

        // 1. Resend REST API (HTTPS port 443 - zero firewall/port block issues)
        if (!string.IsNullOrWhiteSpace(config.ResendApiKey))
        {
            try
            {
                return await SendViaResendAsync(config, toEmail, toName, subject, plainText, htmlBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RESEND ERROR] Failed to send via Resend API: {Message}. Trying SMTP fallback if available.", ex.Message);
                if (!IsSmtpConfigured) throw;
            }
        }

        // 2. Brevo REST API (HTTPS port 443)
        if (!string.IsNullOrWhiteSpace(config.BrevoApiKey))
        {
            try
            {
                return await SendViaBrevoAsync(config, toEmail, toName, subject, plainText, htmlBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BREVO ERROR] Failed to send via Brevo API: {Message}. Trying SMTP fallback if available.", ex.Message);
                if (!IsSmtpConfigured) throw;
            }
        }

        // 3. MailKit SMTP with automatic port failover (587 <-> 465)
        return await SendViaSmtpWithFallbackAsync(config, toEmail, toName, subject, plainText, htmlBody);
    }

    private async Task<bool> SendViaResendAsync(EmailConfig config, string toEmail, string toName, string subject, string plainText, string htmlBody)
    {
        _logger.LogInformation("[RESEND] Sending email to {ToEmail} via Resend HTTPS API...", toEmail);

        using var client = CreateHttpClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.ResendApiKey);

        // Resend requires a verified domain sender or onboarding sender
        var sender = config.FromAddress ?? "onboarding@resend.dev";
        var formattedFrom = $"{config.FromName} <{sender}>";

        var payload = new
        {
            from = formattedFrom,
            to = new[] { toEmail },
            subject,
            text = plainText,
            html = htmlBody
        };

        var response = await client.PostAsync(
            "https://api.resend.com/emails",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("[RESEND ERROR] HTTP {Status}: {Body}", response.StatusCode, responseBody);
            throw new InvalidOperationException($"Resend API rejected email (HTTP {response.StatusCode}): {responseBody}");
        }

        _logger.LogInformation("[RESEND] Successfully sent email to {ToEmail}. Response: {Body}", toEmail, responseBody);
        return true;
    }

    private async Task<bool> SendViaBrevoAsync(EmailConfig config, string toEmail, string toName, string subject, string plainText, string htmlBody)
    {
        _logger.LogInformation("[BREVO] Sending email to {ToEmail} via Brevo HTTPS API...", toEmail);

        using var client = CreateHttpClient();
        client.DefaultRequestHeaders.Add("api-key", config.BrevoApiKey);

        var sender = config.FromAddress ?? "no-reply@myspot.com";
        var payload = new
        {
            sender = new { name = config.FromName, email = sender },
            to = new[] { new { email = toEmail, name = toName } },
            subject,
            textContent = plainText,
            htmlContent = htmlBody
        };

        var response = await client.PostAsync(
            "https://api.brevo.com/v3/smtp/email",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("[BREVO ERROR] HTTP {Status}: {Body}", response.StatusCode, responseBody);
            throw new InvalidOperationException($"Brevo API error (HTTP {response.StatusCode}): {responseBody}");
        }

        _logger.LogInformation("[BREVO] Successfully sent email to {ToEmail}.", toEmail);
        return true;
    }

    private async Task<bool> SendViaSmtpWithFallbackAsync(EmailConfig config, string toEmail, string toName, string subject, string plainText, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(config.FromAddress) || string.IsNullOrWhiteSpace(config.Password))
        {
            _logger.LogWarning("[SMTP] SMTP credentials (SMTP_FROM / SMTP_PASSWORD) are not configured.");
            return false;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(config.FromName, config.FromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Date = DateTimeOffset.Now;

        var body = new BodyBuilder
        {
            TextBody = plainText,
            HtmlBody = htmlBody
        };
        message.Body = body.ToMessageBody();

        var primaryPort = config.Port;
        var alternatePort = primaryPort == 465 ? 587 : 465;

        try
        {
            await AttemptSmtpDeliveryAsync(config, primaryPort, message);
            _logger.LogInformation("[SMTP] Successfully delivered email to {Email} via port {Port}.", toEmail, primaryPort);
            return true;
        }
        catch (Exception primaryEx) when (primaryEx is System.Net.Sockets.SocketException
                                          || primaryEx is TimeoutException
                                          || primaryEx is MailKit.Net.Smtp.SmtpCommandException
                                          || primaryEx.InnerException is System.Net.Sockets.SocketException)
        {
            _logger.LogWarning(primaryEx, "[SMTP] Port {PrimaryPort} failed with network/socket error. Retrying with alternate port {AltPort}...", primaryPort, alternatePort);

            try
            {
                await AttemptSmtpDeliveryAsync(config, alternatePort, message);
                _logger.LogInformation("[SMTP] Successfully delivered email to {Email} via fallback port {Port}.", toEmail, alternatePort);
                return true;
            }
            catch (Exception altEx)
            {
                _logger.LogError(altEx, "[SMTP] Fallback port {AltPort} also failed: {Message}", alternatePort, altEx.Message);
                throw new InvalidOperationException(
                    $"SMTP delivery failed on both port {primaryPort} and {alternatePort}. " +
                    "If deployed on Render Free tier, all outbound SMTP ports (25, 465, 587) are blocked by Render. " +
                    "Please configure RESEND_API_KEY in Render environment variables or upgrade to a paid instance.",
                    altEx);
            }
        }
    }

    private async Task AttemptSmtpDeliveryAsync(EmailConfig config, int port, MimeMessage message)
    {
        using var client = new SmtpClient();
        client.Timeout = 10000; // 10s connection timeout

        if (config.IgnoreCertErrors)
        {
            client.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true;
        }

        var secureOption = port == 465
            ? SecureSocketOptions.SslOnConnect
            : (port == 587 ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto);

        var authUser = config.User ?? config.FromAddress!;

        _logger.LogInformation("[SMTP] Connecting to {Host}:{Port} ({Security})...", config.Host, port, secureOption);
        await client.ConnectAsync(config.Host, port, secureOption);

        _logger.LogInformation("[SMTP] Authenticating with user {User}...", authUser);
        await client.AuthenticateAsync(authUser, config.Password ?? string.Empty);

        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    public async Task<bool> SendOtpEmailAsync(string toEmail, string toName, string otp)
    {
        var config = GetConfig();

        if (!IsConfigured)
        {
            _logger.LogWarning("[EMAIL] SMTP credentials (SMTP_FROM / SMTP_PASSWORD) or RESEND_API_KEY are not configured. Real email skipped.");
            if (string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("[DEV OTP] Verification code for {Email}: {Otp}", toEmail, otp);
            }
            return false;
        }

        var subject = "Your MySpot Verification Code";
        var plainText = $"Hi {toName},\n\nYour MySpot verification code is: {otp}\n\nThis code expires in 10 minutes. If you did not create a MySpot account, please ignore this email.\n\nMySpot Member Portal";

        var html = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#f3f7ff;font-family:Inter,system-ui,sans-serif'>
  <div style='max-width:480px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.10)'>
    <div style='background:linear-gradient(135deg,#0f172a,#0284c7);padding:32px 36px;text-align:center'>
      <div style='width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px'>🏆</div>
      <h1 style='color:white;margin:0;font-size:1.8rem'>MySpot</h1>
      <p style='color:rgba(255,255,255,0.7);margin:8px 0 0'>Premium Sports Facility Booking</p>
    </div>
    <div style='padding:36px'>
      <h2 style='color:#142d4d;margin:0 0 12px'>Verify your email</h2>
      <p style='color:#58728d;margin:0 0 28px'>Hi {toName}, use the verification code below to complete your registration. It expires in 10 minutes.</p>
      <div style='background:#f0f9ff;border-radius:16px;padding:24px;text-align:center;letter-spacing:0.3em;font-size:2.6rem;font-weight:800;color:#0284c7;border:2px solid rgba(2,132,199,0.2)'>
        {otp}
      </div>
      <p style='color:#58728d;margin:20px 0 0;font-size:0.85rem'>If you didn't create a MySpot account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, toName, subject, plainText, html);
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string toName, string otp)
    {
        var config = GetConfig();

        if (!IsConfigured)
        {
            _logger.LogWarning("[EMAIL] Email service is not configured. Password reset email to {Email} skipped.", toEmail);
            _logger.LogInformation("[DEV RESET OTP] Recovery code for {Email}: {Otp}", toEmail, otp);
            return false;
        }

        var subject = "Reset Your MySpot Password";
        var plainText = $"Hi {toName},\n\nYour MySpot password reset code is: {otp}\n\nThis code expires in 10 minutes. If you did not request a password reset, please secure your account immediately.\n\nMySpot Security Team";

        var html = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif'>
  <div style='max-width:480px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.10)'>
    <div style='background:linear-gradient(135deg,#0f172a,#dc2626);padding:32px 36px;text-align:center'>
      <div style='width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px'>🔐</div>
      <h1 style='color:white;margin:0;font-size:1.8rem'>MySpot</h1>
      <p style='color:rgba(255,255,255,0.8);margin:8px 0 0'>Security & Access Recovery</p>
    </div>
    <div style='padding:36px'>
      <h2 style='color:#142d4d;margin:0 0 12px'>Password Reset Request</h2>
      <p style='color:#58728d;margin:0 0 24px'>Hi {toName}, we received a request to reset your password. Use the verification code below to proceed:</p>
      <div style='background:#fef2f2;border-radius:16px;padding:24px;text-align:center;letter-spacing:0.3em;font-size:2.6rem;font-weight:800;color:#dc2626;border:2px solid rgba(220,38,38,0.18)'>
        {otp}
      </div>
      <p style='color:#64748b;margin:22px 0 0;font-size:0.85rem'>This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, toName, subject, plainText, html);
    }
}
