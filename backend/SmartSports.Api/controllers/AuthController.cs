using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Dtos;
using SmartSportsFacilityBooking.Models;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly OtpStore _otpStore;
    private readonly EmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        OtpStore otpStore,
        EmailService emailService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _otpStore = otpStore;
        _emailService = emailService;
        _logger = logger;
    }

    /// <summary>
    /// Step 1 of registration: validates inputs, stores a pending registration and sends OTP to the given email.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.ContactNumber) ||
            string.IsNullOrWhiteSpace(request.NicNumber) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("All fields are required.");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.ContactNumber.Trim(), @"^\d{10}$"))
            return BadRequest("Contact number must contain exactly 10 digits.");

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.NicNumber.Trim(), @"^(\d{9}[VvXx]|\d{12})$"))
            return BadRequest("NIC must be 12 digits or 9 digits followed by V or X.");

        if (request.Password.Length < 8 ||
            !request.Password.Any(char.IsUpper) ||
            !request.Password.Any(char.IsLower) ||
            !request.Password.Any(char.IsDigit) ||
            !request.Password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return BadRequest("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
        }

        var cleanEmail = request.Email.Trim().TrimEnd('.').ToLower();
        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == cleanEmail);

        if (existingUser != null)
        {
            return BadRequest("Email is already registered.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var otp = _otpStore.GenerateAndStore(cleanEmail, request.FullName.Trim(), request.ContactNumber.Trim(), request.NicNumber.Trim(), passwordHash);

        var requireRealEmail = string.Equals(Environment.GetEnvironmentVariable("REQUIRE_REAL_EMAIL"), "true", StringComparison.OrdinalIgnoreCase);
        var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();

        try
        {
            var emailSent = await _emailService.SendOtpEmailAsync(
                cleanEmail,
                request.FullName.Trim(),
                otp);

            if (!emailSent)
            {
                if (requireRealEmail || !isDevelopment)
                {
                    return StatusCode(503, "Email delivery is not configured. Configure SMTP_FROM and SMTP_PASSWORD in .env.");
                }

                return Ok(new
                {
                    message = "SMTP is not configured. For local development, use the OTP shown below or in the API console.",
                    devOtp = otp,
                    smtpConfigured = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMTP ERROR] Failed to send registration OTP to {Email}: {Message}", request.Email, ex.Message);

            if (requireRealEmail || !isDevelopment)
            {
                if (!isDevelopment)
                {
                    return StatusCode(503, "Unable to send verification email. Please try again later.");
                }

                var userFriendlyReason = ex switch
                {
                    MailKit.Security.AuthenticationException => "SMTP authentication failed. Verify the configured SMTP credentials.",
                    System.Net.Sockets.SocketException or TimeoutException => "SMTP connection timed out or the configured port is unavailable.",
                    _ => "The configured SMTP service returned an error."
                };

                return StatusCode(503, $"Unable to send verification email. {userFriendlyReason}");
            }

            // In local development without REQUIRE_REAL_EMAIL=true, allow fallback so developers on Mac/Windows/Linux are never blocked
            _logger.LogWarning("[SMTP FALLBACK] Using dev OTP for {Email} because SMTP failed: {Message}", request.Email, ex.Message);
            return Ok(new
            {
                message = $"SMTP failed ({ex.Message}). For local development, use the OTP shown below or in the API console.",
                devOtp = otp,
                smtpConfigured = false,
                smtpError = ex.Message
            });
        }

        return Ok(new
        {
            message = "OTP sent to your email. Please verify to complete registration.",
            smtpConfigured = true
        });
    }

    /// <summary>
    /// Step 2 of registration: verify the OTP and create the account.
    /// </summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
            return BadRequest("Email and OTP are required.");

        var cleanEmail = request.Email.Trim().TrimEnd('.').ToLower();
        var (valid, fullName, contactNumber, nicNumber, passwordHash) = _otpStore.Verify(cleanEmail, request.Otp.Trim());
        if (!valid)
            return BadRequest("Invalid or expired OTP. Please register again.");

        // Double-check the email isn't already registered (race-condition guard)
        if (await _context.Users.AnyAsync(u => u.Email == cleanEmail))
            return BadRequest("Email is already registered.");

        var customerRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == "Customer");

        if (customerRole == null)
            return BadRequest("Customer role does not exist.");

        var user = new User
        {
            FullName = fullName!,
            Email = cleanEmail,
            ContactNumber = contactNumber!,
            NicNumber = nicNumber!,
            PasswordHash = passwordHash!,
            RoleId = customerRole.Id
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Registration successful. You can now sign in.",
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            role = customerRole.Name
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null)
        {
            return Unauthorized("Invalid email or password.");
        }

        var passwordValid = BCrypt.Net.BCrypt.Verify(
            request.Password,
            user.PasswordHash);

        if (!passwordValid)
        {
            return Unauthorized("Invalid email or password.");
        }

        var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
            ?? HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["Jwt:Key"];

        if (string.IsNullOrEmpty(jwtKey))
        {
            return StatusCode(500, "JWT key is not configured.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role?.Name ?? "Customer")
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey));

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256);

        var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
            ?? HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["Jwt:Issuer"]
            ?? "SmartSports.Api";

        var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
            ?? HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["Jwt:Audience"]
            ?? "SmartSports.Client";

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(60),
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler()
            .WriteToken(token);

        return Ok(new
        {
            message = "Login successful.",
            token = tokenString,
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            contactNumber = user.ContactNumber,
            nicNumber = user.NicNumber,
            role = user.Role?.Name
        });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest("Email address is required.");

        var cleanEmail = request.Email.Trim().ToLower();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == cleanEmail);
        if (user == null)
        {
            return Ok(new
            {
                message = "If an account matches that email, a verification code has been sent.",
                emailSent = true
            });
        }

        var otp = _otpStore.GenerateAndStoreResetOtp(cleanEmail);

        var requireRealEmail = string.Equals(Environment.GetEnvironmentVariable("REQUIRE_REAL_EMAIL"), "true", StringComparison.OrdinalIgnoreCase);
        var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();

        try
        {
            var emailSent = await _emailService.SendPasswordResetEmailAsync(user.Email, user.FullName, otp);
            if (!emailSent)
            {
                if (requireRealEmail || !isDevelopment)
                {
                    return StatusCode(503, "Email delivery is not configured. Configure SMTP in .env to enable password resets.");
                }

                return Ok(new
                {
                    message = "Verification code generated. (SMTP dev fallback).",
                    devOtp = otp,
                    smtpConfigured = false,
                    emailSent = true
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SMTP ERROR] Failed to send reset email to {Email}: {Message}", user.Email, ex.Message);

            if (requireRealEmail || !isDevelopment)
            {
                return StatusCode(503, $"Unable to send password reset email. Check SMTP configuration: {ex.Message}");
            }

            return Ok(new
            {
                message = $"SMTP error ({ex.Message}). (SMTP dev fallback).",
                devOtp = otp,
                smtpConfigured = false,
                emailSent = true,
                smtpError = ex.Message
            });
        }

        return Ok(new
        {
            message = "A password reset verification code has been sent to your email.",
            emailSent = true,
            smtpConfigured = true
        });
    }

    /// <summary>
    /// Checks the current SMTP configuration status (never reveals passwords).
    /// Useful for cross-platform debugging on Windows, macOS, and Linux.
    /// </summary>
    [HttpGet("smtp-status")]
    public IActionResult GetSmtpStatus()
    {
        var (host, port, fromAddress, password, fromName, ignoreCertErrors) = _emailService.GetSmtpConfig();
        var isConfigured = !string.IsNullOrWhiteSpace(fromAddress) && !string.IsNullOrWhiteSpace(password);
        var requireRealEmail = string.Equals(Environment.GetEnvironmentVariable("REQUIRE_REAL_EMAIL"), "true", StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            isConfigured,
            host,
            port,
            fromAddress = string.IsNullOrWhiteSpace(fromAddress) ? "Not set" : fromAddress,
            fromName,
            ignoreCertErrors,
            requireRealEmail,
            environment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().EnvironmentName,
            status = isConfigured
                ? "SMTP is configured for real email delivery."
                : "SMTP is not configured. Running in local development mode (devOtp enabled)."
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest("Email, verification code, and new password are required.");

        var cleanEmail = request.Email.Trim().ToLower();
        if (!_otpStore.VerifyResetOtp(cleanEmail, request.Otp.Trim()))
            return BadRequest("Invalid or expired verification code.");

        if (request.NewPassword.Length < 8 ||
            !request.NewPassword.Any(char.IsUpper) ||
            !request.NewPassword.Any(char.IsLower) ||
            !request.NewPassword.Any(char.IsDigit) ||
            !request.NewPassword.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return BadRequest("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == cleanEmail);
        if (user == null)
            return BadRequest("User account not found.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Password has been successfully updated. You can now sign in with your new password."
        });
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest("Current password and new password are required.");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("User not found.");

        var passwordValid = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash);
        if (!passwordValid)
            return BadRequest("Current password is incorrect.");

        if (request.NewPassword.Length < 8 ||
            !request.NewPassword.Any(char.IsUpper) ||
            !request.NewPassword.Any(char.IsLower) ||
            !request.NewPassword.Any(char.IsDigit) ||
            !request.NewPassword.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return BadRequest("New password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Password updated successfully."
        });
    }
}