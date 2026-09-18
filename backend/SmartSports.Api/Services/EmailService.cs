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

    public async Task SendOtpEmailAsync(string toEmail, string toName, string otp)
    {
        var fromAddress = _config["Smtp:From"] ?? Environment.GetEnvironmentVariable("SMTP_FROM");
        var password = _config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");
        var host = _config["Smtp:Host"] ?? "smtp.gmail.com";
        var port = int.Parse(_config["Smtp:Port"] ?? "587");

        if (string.IsNullOrWhiteSpace(fromAddress) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("SMTP credentials are not configured. OTP email to {Email} skipped.", toEmail);
            // In development, log the OTP so it can be retrieved without email
            _logger.LogInformation("DEV OTP for {Email}: {Otp}", toEmail, otp);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("SmartSports", fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Your SmartSports Verification Code";

        var body = new BodyBuilder
        {
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
    }
}
