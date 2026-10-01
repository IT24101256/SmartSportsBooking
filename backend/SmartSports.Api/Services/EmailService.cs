using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SmartSportsFacilityBooking.Services;

/// <summary>
/// Sends transactional emails via SMTP (Gmail, Outlook, SendGrid, custom).
/// Supports cross-platform environments (Windows, macOS, Linux).
/// </summary>
public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public (string host, int port, string? from, string? password, string fromName, bool ignoreCertErrors) GetSmtpConfig()
    {
        var host = (Environment.GetEnvironmentVariable("SMTP_HOST") ?? _config["Smtp:Host"] ?? "smtp.gmail.com").Trim();
        var portStr = (Environment.GetEnvironmentVariable("SMTP_PORT") ?? _config["Smtp:Port"] ?? "587").Trim();
        int.TryParse(portStr, out var port);
        if (port <= 0) port = 587;

        var from = (Environment.GetEnvironmentVariable("SMTP_FROM") ?? _config["Smtp:From"])?.Trim();
        var password = (Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? _config["Smtp:Password"])?.Trim();
        var fromName = (Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? _config["Smtp:FromName"] ?? "MySpot Sports").Trim();

        var ignoreCertStr = Environment.GetEnvironmentVariable("SMTP_IGNORE_CERT_ERRORS") ?? "true";
        var ignoreCert = !string.Equals(ignoreCertStr, "false", StringComparison.OrdinalIgnoreCase);

        // Remove whitespace from Google App Passwords if using Gmail
        if (!string.IsNullOrWhiteSpace(password) && host.Contains("gmail", StringComparison.OrdinalIgnoreCase))
        {
            password = password.Replace(" ", "");
        }

        return (host, port, from, password, fromName, ignoreCert);
    }

    public bool IsSmtpConfigured
    {
        get
        {
            var config = GetSmtpConfig();
            return !string.IsNullOrWhiteSpace(config.from) && !string.IsNullOrWhiteSpace(config.password);
        }
    }

    public async Task<bool> SendOtpEmailAsync(string toEmail, string toName, string otp)
    {
        var (host, port, fromAddress, password, fromName, ignoreCertErrors) = GetSmtpConfig();

        if (string.IsNullOrWhiteSpace(fromAddress) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("[SMTP] SMTP credentials (SMTP_FROM / SMTP_PASSWORD) are not configured. Real email skipped.");
            _logger.LogInformation("[DEV OTP] Verification code for {Email}: {Otp}", toEmail, otp);
            return false;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Your MySpot Verification Code";
        message.Date = DateTimeOffset.Now;

        var body = new BodyBuilder
        {
            TextBody = $"Hi {toName},\n\nYour MySpot verification code is: {otp}\n\nThis code expires in 10 minutes. If you did not create a MySpot account, please ignore this email.\n\nMySpot Member Portal",
            HtmlBody = $@"
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
</html>"
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        client.Timeout = 12000; // 12 seconds timeout

        if (ignoreCertErrors)
        {
            // Bypasses macOS/Linux certificate store issues or local SSL proxy inspection
            client.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true;
        }

        var secureOption = port == 465
            ? SecureSocketOptions.SslOnConnect
            : (port == 587 ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto);

        _logger.LogInformation("[SMTP] Connecting to {Host}:{Port} ({Security})...", host, port, secureOption);
        await client.ConnectAsync(host, port, secureOption);

        _logger.LogInformation("[SMTP] Authenticating with sender {FromAddress}...", fromAddress);
        await client.AuthenticateAsync(fromAddress, password);

        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("[SMTP] Successfully delivered verification email to {Email}", toEmail);
        return true;
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string toName, string otp)
    {
        var (host, port, fromAddress, password, fromName, ignoreCertErrors) = GetSmtpConfig();

        if (string.IsNullOrWhiteSpace(fromAddress) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("[SMTP] SMTP credentials are not configured. Password reset email to {Email} skipped.", toEmail);
            _logger.LogInformation("[DEV RESET OTP] Recovery code for {Email}: {Otp}", toEmail, otp);
            return false;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress($"{fromName} Security", fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Reset Your MySpot Password";
        message.Date = DateTimeOffset.Now;

        var body = new BodyBuilder
        {
            TextBody = $"Hi {toName},\n\nYour MySpot password reset code is: {otp}\n\nThis code expires in 10 minutes. If you did not request a password reset, please secure your account immediately.\n\nMySpot Security Team",
            HtmlBody = $@"
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
</html>"
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        client.Timeout = 12000;

        if (ignoreCertErrors)
        {
            client.ServerCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true;
        }

        var secureOption = port == 465
            ? SecureSocketOptions.SslOnConnect
            : (port == 587 ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto);

        await client.ConnectAsync(host, port, secureOption);
        await client.AuthenticateAsync(fromAddress, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("[SMTP] Successfully delivered password reset email to {Email}", toEmail);
        return true;
    }
}
