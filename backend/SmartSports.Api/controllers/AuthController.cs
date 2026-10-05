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
        var allowDevOtpFallback = string.Equals(Environment.GetEnvironmentVariable("ALLOW_DEV_OTP_FALLBACK"), "true", StringComparison.OrdinalIgnoreCase);
        var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();
        var enforceRealEmail = (requireRealEmail || !isDevelopment) && !allowDevOtpFallback;

        try
        {
            var emailSent = await _emailService.SendOtpEmailAsync(
                cleanEmail,
                request.FullName.Trim(),
                otp);

            if (!emailSent)
            {
                if (enforceRealEmail)
                {
                    return StatusCode(503, "Email delivery is not configured on the server. Please configure SMTP credentials (SMTP_FROM, SMTP_PASSWORD) or RESEND_API_KEY.");
                }

                return Ok(new
                {
                    message = "Email service is not configured. For development or testing, use the verification code shown below or in the API console.",
                    devOtp = otp,
                    smtpConfigured = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMAIL ERROR] Failed to send registration OTP to {Email}: {Message}", request.Email, ex.Message);

            if (enforceRealEmail)
            {
                var userFriendlyReason = ex switch
                {
                    MailKit.Security.AuthenticationException => "SMTP authentication failed. Verify your email credentials or Google App Password.",
                    System.Net.Sockets.SocketException or TimeoutException => "Email server connection timed out. If hosted on Render Free tier, outbound SMTP ports (25, 465, 587) are blocked by Render. Configure RESEND_API_KEY in Render environment variables or upgrade to a paid instance.",
                    _ => ex.Message
                };

                return StatusCode(503, $"Unable to send verification email. {userFriendlyReason}");
            }

            // In local development or when ALLOW_DEV_OTP_FALLBACK is enabled, fall back to dev OTP so developers & testers are never blocked
            _logger.LogWarning("[EMAIL FALLBACK] Using dev OTP for {Email} because sending failed: {Message}", request.Email, ex.Message);
            return Ok(new
            {
                message = $"Email delivery failed ({ex.Message}). Using verification code fallback for development.",
                devOtp = otp,
                smtpConfigured = false,
                smtpError = ex.Message
            });
        }

        return Ok(new
        {
            message = "Verification code sent to your email. Please verify to complete registration.",
            smtpConfigured = true
        });
    }

    /// <summary>
    /// Resends a verification OTP for a pending registration.
    /// </summary>
    [HttpPost("resend-otp")]
    public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Email))
            return BadRequest("Email address is required.");

        var cleanEmail = request.Email.Trim().TrimEnd('.').ToLower();
        var (found, newOtp, fullName) = _otpStore.ResendRegistrationOtp(cleanEmail);

        if (!found || string.IsNullOrWhiteSpace(newOtp))
        {
            return BadRequest("No pending registration found for this email, or the previous code has expired. Please register again.");
        }

        var requireRealEmail = string.Equals(Environment.GetEnvironmentVariable("REQUIRE_REAL_EMAIL"), "true", StringComparison.OrdinalIgnoreCase);
        var allowDevOtpFallback = string.Equals(Environment.GetEnvironmentVariable("ALLOW_DEV_OTP_FALLBACK"), "true", StringComparison.OrdinalIgnoreCase);
        var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();
        var enforceRealEmail = (requireRealEmail || !isDevelopment) && !allowDevOtpFallback;

        try
        {
            var sent = await _emailService.SendOtpEmailAsync(cleanEmail, fullName ?? "Member", newOtp);
            if (!sent)
            {
                if (enforceRealEmail)
                {
                    return StatusCode(503, "Email delivery is not configured on the server.");
                }

                return Ok(new
                {
                    message = "Verification code regenerated (dev fallback).",
                    devOtp = newOtp,
                    smtpConfigured = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMAIL ERROR] Failed to resend OTP to {Email}: {Message}", cleanEmail, ex.Message);
            if (enforceRealEmail)
            {
                return StatusCode(503, $"Unable to resend email: {ex.Message}");
            }

            return Ok(new
            {
                message = $"Email failed ({ex.Message}). Dev OTP generated.",
                devOtp = newOtp,
                smtpConfigured = false,
                smtpError = ex.Message
            });
        }

        return Ok(new
        {
            message = "A fresh verification code has been sent to your email.",
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
            role = user.Role?.Name,
            profilePicture = user.ProfilePicture != null ? $"/api/auth/profile/picture/{user.Id}" : null
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
        var allowDevOtpFallback = string.Equals(Environment.GetEnvironmentVariable("ALLOW_DEV_OTP_FALLBACK"), "true", StringComparison.OrdinalIgnoreCase);
        var isDevelopment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment();
        var enforceRealEmail = (requireRealEmail || !isDevelopment) && !allowDevOtpFallback;

        try
        {
            var emailSent = await _emailService.SendPasswordResetEmailAsync(user.Email, user.FullName, otp);
            if (!emailSent)
            {
                if (enforceRealEmail)
                {
                    return StatusCode(503, "Email delivery is not configured on the server. Configure SMTP or RESEND_API_KEY in environment variables.");
                }

                return Ok(new
                {
                    message = "Verification code generated. (dev fallback).",
                    devOtp = otp,
                    smtpConfigured = false,
                    emailSent = true
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMAIL ERROR] Failed to send reset email to {Email}: {Message}", user.Email, ex.Message);

            if (enforceRealEmail)
            {
                var reason = ex switch
                {
                    MailKit.Security.AuthenticationException => "SMTP authentication failed. Check configured email credentials.",
                    System.Net.Sockets.SocketException or TimeoutException => "SMTP connection timed out. If hosted on Render Free tier, SMTP ports are blocked; configure RESEND_API_KEY.",
                    _ => ex.Message
                };
                return StatusCode(503, $"Unable to send password reset email. {reason}");
            }

            return Ok(new
            {
                message = $"Email delivery error ({ex.Message}). (dev fallback).",
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
    /// Checks the current Email / SMTP configuration status (never reveals passwords).
    /// Useful for cross-platform debugging on Windows, macOS, Linux, and Cloud (Render, Docker).
    /// </summary>
    [HttpGet("smtp-status")]
    public IActionResult GetSmtpStatus()
    {
        var cfg = _emailService.GetConfig();
        var requireRealEmail = string.Equals(Environment.GetEnvironmentVariable("REQUIRE_REAL_EMAIL"), "true", StringComparison.OrdinalIgnoreCase);
        var allowDevOtpFallback = string.Equals(Environment.GetEnvironmentVariable("ALLOW_DEV_OTP_FALLBACK"), "true", StringComparison.OrdinalIgnoreCase);

        return Ok(new
        {
            isConfigured = _emailService.IsConfigured,
            isSmtpConfigured = _emailService.IsSmtpConfigured,
            activeProvider = _emailService.ActiveProviderName,
            host = cfg.Host,
            port = cfg.Port,
            fromAddress = string.IsNullOrWhiteSpace(cfg.FromAddress) ? "Not set" : cfg.FromAddress,
            authUser = string.IsNullOrWhiteSpace(cfg.User) ? (cfg.FromAddress ?? "Not set") : cfg.User,
            fromName = cfg.FromName,
            ignoreCertErrors = cfg.IgnoreCertErrors,
            hasResendApiKey = !string.IsNullOrWhiteSpace(cfg.ResendApiKey),
            hasBrevoApiKey = !string.IsNullOrWhiteSpace(cfg.BrevoApiKey),
            requireRealEmail,
            allowDevOtpFallback,
            environment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>().EnvironmentName,
            status = _emailService.IsConfigured
                ? $"Email delivery configured via {_emailService.ActiveProviderName}."
                : "Email delivery is not configured. Running in local development / fallback mode (devOtp enabled)."
        });
    }

    public record TestEmailRequest(string? ToEmail);

    /// <summary>
    /// Diagnostic endpoint to test transactional email sending directly.
    /// </summary>
    [HttpPost("test-email")]
    public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest? request)
    {
        var cfg = _emailService.GetConfig();
        var to = !string.IsNullOrWhiteSpace(request?.ToEmail) ? request.ToEmail.Trim() : cfg.FromAddress;

        if (string.IsNullOrWhiteSpace(to))
        {
            return BadRequest("Please provide 'toEmail' in request body or configure SMTP_FROM in environment.");
        }

        try
        {
            var sent = await _emailService.SendOtpEmailAsync(to, "Test User", "123456");
            return Ok(new
            {
                success = sent,
                recipient = to,
                provider = _emailService.ActiveProviderName,
                message = sent ? "Test verification email dispatched successfully!" : "Email skipped because no provider is configured."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TEST EMAIL ERROR] {Message}", ex.Message);
            return StatusCode(500, new
            {
                success = false,
                recipient = to,
                provider = _emailService.ActiveProviderName,
                error = ex.Message,
                inner = ex.InnerException?.Message
            });
        }
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

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound("User not found.");

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            contactNumber = user.ContactNumber,
            nicNumber = user.NicNumber,
            role = user.Role?.Name,
            profilePicture = user.ProfilePicture != null ? $"/api/auth/profile/picture/{user.Id}" : null
        });
    }

    [Microsoft.AspNetCore.Authorization.Authorize]
    [HttpPost("profile/picture")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadProfilePicture(IFormFile? file)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest("A picture file is required.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("Profile picture cannot exceed 5 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(extension))
            return BadRequest("Profile picture must be a JPG, PNG, or WEBP image.");

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound("User not found.");

        var uploadDir = Path.Combine(AppContext.BaseDirectory, "uploads", "profiles");
        Directory.CreateDirectory(uploadDir);

        var storedName = $"avatar_{user.Id}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDir, storedName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        user.ProfilePicture = storedName;
        await _context.SaveChangesAsync();

        var pictureUrl = $"/api/auth/profile/picture/{user.Id}?t={DateTime.UtcNow.Ticks}";

        return Ok(new
        {
            message = "Profile picture updated successfully.",
            userId = user.Id,
            fullName = user.FullName,
            email = user.Email,
            contactNumber = user.ContactNumber,
            nicNumber = user.NicNumber,
            role = user.Role?.Name,
            profilePicture = pictureUrl
        });
    }

    [HttpGet("profile/picture/{id:int}")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public async Task<IActionResult> GetProfilePicture(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (string.IsNullOrWhiteSpace(user?.ProfilePicture))
            return NotFound("Profile picture not found.");

        var filePath = Path.Combine(AppContext.BaseDirectory, "uploads", "profiles", user.ProfilePicture);
        if (!System.IO.File.Exists(filePath))
            return NotFound("Image file not found.");

        var extension = Path.GetExtension(user.ProfilePicture).ToLowerInvariant();
        var contentType = extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "image/jpeg"
        };

        return PhysicalFile(filePath, contentType);
    }
}