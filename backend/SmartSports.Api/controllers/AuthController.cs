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

        var existingUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.Trim().ToLower());

        if (existingUser != null)
        {
            return BadRequest("Email is already registered.");
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var otp = _otpStore.GenerateAndStore(request.Email.Trim().ToLower(), request.FullName.Trim(), request.ContactNumber.Trim(), request.NicNumber.Trim(), passwordHash);

        try
        {
            var emailSent = await _emailService.SendOtpEmailAsync(
                request.Email.Trim(),
                request.FullName.Trim(),
                otp);

            if (!emailSent)
            {
                var environment = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
                if (environment.IsDevelopment())
                {
                    return Ok(new
                    {
                        message = "SMTP is not configured. For local development, use the OTP shown below or in the API console.",
                        devOtp = otp,
                        smtpConfigured = false
                    });
                }

                return StatusCode(503, "Email delivery is not configured. Configure an email provider and try again.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send registration OTP to {Email}.", request.Email);
            return StatusCode(503, "Unable to send the verification email. Check the SMTP configuration and try again.");
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

        var (valid, fullName, contactNumber, nicNumber, passwordHash) = _otpStore.Verify(request.Email.Trim().ToLower(), request.Otp.Trim());
        if (!valid)
            return BadRequest("Invalid or expired OTP. Please register again.");

        // Double-check the email isn't already registered (race-condition guard)
        if (await _context.Users.AnyAsync(u => u.Email == request.Email.Trim().ToLower()))
            return BadRequest("Email is already registered.");

        var customerRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == "Customer");

        if (customerRole == null)
            return BadRequest("Customer role does not exist.");

        var user = new User
        {
            FullName = fullName!,
            Email = request.Email.Trim().ToLower(),
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
}