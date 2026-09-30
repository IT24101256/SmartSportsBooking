using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SmartSportsFacilityBooking.Services;

/// <summary>
/// Sends transactional emails via Gmail SMTP using app-specific passwords.
/// Configure via environment variables SMTP_FROM, SMTP_PASSWORD (app password).
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

    public async Task<bool> SendOtpEmailAsync(string toEmail, string toName, string otp)
    {
        var fromAddress = (_config["Smtp:From"] ?? Environment.GetEnvironmentVariable("SMTP_FROM"))?.Trim();
        var password = (_config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD"))?.Trim();
        var host = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var port = int.Parse(_config["Smtp:Port"] ?? "587");

        if (!string.IsNullOrWhiteSpace(password) && host.Contains("gmail", StringComparison.OrdinalIgnoreCase))
        {
            password = password.Replace(" ", "");
        }

        if (string.IsNullOrWhiteSpace(fromAddress) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("SMTP credentials are not configured. OTP email to {Email} skipped.", toEmail);
            // In development, log the OTP so it can be retrieved without email
            _logger.LogInformation("DEV OTP for {Email}: {Otp}", toEmail, otp);
            return false;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("SmartSports", fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Your SmartSports Verification Code";
        message.Date = DateTimeOffset.Now;

        var body = new BodyBuilder
        {
            TextBody = $"Hi {toName},\n\nYour SmartSports verification code is: {otp}\n\nThis code expires in 10 minutes. If you did not create a SmartSports account, please ignore this email.\n\nSmartSports Member Portal",
            HtmlBody = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#f3f7ff;font-family:Inter,sans-serif'>
  <div style='max-width:480px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.10)'>
    <div style='background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:32px 36px;text-align:center'>
      <div style='width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px'>🏆</div>
      <h1 style='color:white;margin:0;font-size:1.8rem'>SmartSports</h1>
      <p style='color:rgba(255,255,255,0.7);margin:8px 0 0'>Member Portal</p>
    </div>
    <div style='padding:36px'>
      <h2 style='color:#142d4d;margin:0 0 12px'>Verify your email</h2>
      <p style='color:#58728d;margin:0 0 28px'>Hi {toName}, use the code below to complete your registration. It expires in 10 minutes.</p>
      <div style='background:#f3f7ff;border-radius:16px;padding:24px;text-align:center;letter-spacing:0.3em;font-size:2.6rem;font-weight:800;color:#1d4ed8;border:2px solid rgba(29,78,216,0.12)'>
        {otp}
      </div>
      <p style='color:#58728d;margin:20px 0 0;font-size:0.85rem'>If you didn't create a SmartSports account, please ignore this email.</p>
    </div>
  </div>
 </body>
</html>"
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(fromAddress, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
        return true;
    }

    public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string toName, string otp)
    {
        var fromAddress = (_config["Smtp:From"] ?? Environment.GetEnvironmentVariable("SMTP_FROM"))?.Trim();
        var password = (_config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD"))?.Trim();
        var host = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var port = int.Parse(_config["Smtp:Port"] ?? "587");

        if (!string.IsNullOrWhiteSpace(password) && host.Contains("gmail", StringComparison.OrdinalIgnoreCase))
        {
            password = password.Replace(" ", "");
        }

        if (string.IsNullOrWhiteSpace(fromAddress) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("SMTP credentials are not configured. Password reset email to {Email} skipped.", toEmail);
            _logger.LogInformation("DEV RESET OTP for {Email}: {Otp}", toEmail, otp);
            return false;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("SmartSports Security", fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Reset Your SmartSports Password";
        message.Date = DateTimeOffset.Now;

        var body = new BodyBuilder
        {
            TextBody = $"Hi {toName},\n\nYour SmartSports password reset code is: {otp}\n\nThis code expires in 10 minutes. If you did not request a password reset, please secure your account immediately.\n\nSmartSports Security Team",
            HtmlBody = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='margin:0;padding:0;background:#f8fafc;font-family:Inter,sans-serif'>
  <div style='max-width:480px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.10)'>
    <div style='background:linear-gradient(135deg,#0f172a,#dc2626);padding:32px 36px;text-align:center'>
      <div style='width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px'>🔐</div>
      <h1 style='color:white;margin:0;font-size:1.8rem'>SmartSports</h1>
      <p style='color:rgba(255,255,255,0.8);margin:8px 0 0'>Security & Access Recovery</p>
    </div>
    <div style='padding:36px'>
      <h2 style='color:#142d4d;margin:0 0 12px'>Password Reset Request</h2>
      <p style='color:#58728d;margin:0 0 24px'>Hi {toName}, we received a request to reset your password. Use the verification code below to proceed:</p>
      <div style='background:#fef2f2;border-radius:16px;padding:24px;text-align:center;letter-spacing:0.3em;font-size:2.6rem;font-weight:800;color:#dc2626;border:2px solid rgba(220,38,38,0.18)'>
        {otp}
      </div>
      <p style='color:#64748b;margin:22px 0 0;font-size:0.85rem'>This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email or contact support.</p>
    </div>
  </div>
 </body>
</html>"
        };
        message.Body = body.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(fromAddress, password);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
        return true;
    }
}
