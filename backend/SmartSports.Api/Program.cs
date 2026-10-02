//Import JWT Authentication
using Microsoft.AspNetCore.Authentication.JwtBearer;//JWT Bearer authentication
using Microsoft.IdentityModel.Tokens; //Validate and verify JWT tokens.
using System.Text; //Convert the JWT key to bytes.

// Import Entity Framework Core functionality.
using Microsoft.EntityFrameworkCore;

// Import our application's database context.
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Services;
using SmartSportsFacilityBooking.AI;

using System.Text.Json.Serialization;

// Load environment variables from .env file (searching current directory, project directory, parent directories, and base directory)
DotEnvLoader.Load();

// Create the application builder.
var builder = WebApplication.CreateBuilder(args);

// Ensure Environment variables override appsettings
builder.Configuration.AddEnvironmentVariables();

// Dynamic port resolution for cloud deployment platforms (Render, Railway, Cloud Run, Heroku)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    jwtKey = "myspot-super-secure-production-jwt-signing-secret-key-2026-min-32-chars!";
    if (builder.Environment.IsDevelopment())
    {
        Console.WriteLine("[MySpot Auth] Using local development JWT fallback key.");
    }
    else
    {
        Console.WriteLine("[MySpot Auth] Notice: JWT_KEY not explicitly configured. Using built-in default signing key. For maximum security, set JWT_KEY in your deployment environment variables.");
    }
}

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? builder.Configuration["Jwt:Issuer"]
    ?? "SmartSports.Api";

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? builder.Configuration["Jwt:Audience"]
    ?? "SmartSports.Client";

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Add Authorization
builder.Services.AddAuthorization();

// Add Health Checks for cloud container probes (Render, Railway, AWS, K8s)
builder.Services.AddHealthChecks();

// CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
    {
        var configuredOrigins = (Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS")
                ?? builder.Configuration["Cors:AllowedOrigins"]
                ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (configuredOrigins.Length > 0 && !configuredOrigins.Contains("*"))
        {
            policy.WithOrigins(configuredOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
            Console.WriteLine($"[MySpot CORS] Configured allowed origins: {string.Join(", ", configuredOrigins)}");
        }
        else
        {
            policy.SetIsOriginAllowed(_ => true)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
            Console.WriteLine("[MySpot CORS] Permissive CORS enabled (allowing all origins with credentials for mobile & web).");
        }
    });
});

// Register OTP & Email Services
builder.Services.AddSingleton<SmartSportsFacilityBooking.Services.OtpStore>();
builder.Services.AddScoped<SmartSportsFacilityBooking.Services.EmailService>();

// Register Grounded Agentic RAG & Book With AI Subsystems
builder.Services.AddMySpotAiSubsystem();

// Add controller support to the application.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Register Entity Framework Core with flexible connection string resolution
var rawConnectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("POSTGRES_URL")
    ?? Environment.GetEnvironmentVariable("SMARTSPORTS_DB_CONNECTION")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

var dbConnectionString = ConnectionStringHelper.ResolvePostgresConnectionString(rawConnectionString);

if (string.IsNullOrWhiteSpace(dbConnectionString))
{
    if (builder.Environment.IsDevelopment())
    {
        dbConnectionString = "Host=localhost;Port=5432;Database=SmartSportsBookingDb;Username=postgres;Password=your_password";
    }
    else
    {
        throw new InvalidOperationException("Database connection is not configured. Set the DATABASE_URL (or SMARTSPORTS_DB_CONNECTION) environment variable.");
    }
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dbConnectionString)
);

// Add support for API endpoint discovery.
builder.Services.AddEndpointsApiExplorer();

// Add Swagger generation for API documentation and testing.
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter a valid JWT token in the format: Bearer {token}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Build the application.
var app = builder.Build();

// Ensure uploads directories exist for profile pictures, bank slips, and reviews
try
{
    var uploadsBase = Path.Combine(AppContext.BaseDirectory, "uploads");
    Directory.CreateDirectory(Path.Combine(uploadsBase, "profiles"));
    Directory.CreateDirectory(Path.Combine(uploadsBase, "slips"));
    Directory.CreateDirectory(Path.Combine(uploadsBase, "reviews"));
}
catch (Exception ex)
{
    Console.WriteLine($"[MySpot Uploads] Notice creating upload directories: {ex.Message}");
}

// Apply database migrations and seed baseline data
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        logger.LogInformation("[MySpot DB] Applying database migrations...");
        dbContext.Database.Migrate();
        logger.LogInformation("[MySpot DB] Database migrations applied successfully.");

        AppDbContext.SeedRoles(dbContext);
        AppDbContext.SeedDevelopmentAdmin(dbContext);
        AppDbContext.SeedDevelopmentManager(dbContext);
        AppDbContext.SeedFacilities(dbContext);
        AppDbContext.SeedEquipments(dbContext);
        AppDbContext.SeedDashboardData(dbContext);
        logger.LogInformation("[MySpot DB] Database baseline data verified.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[MySpot DB] Database migration/seed encountered an issue during startup.");
        if (app.Environment.IsDevelopment())
        {
            logger.LogWarning("[MySpot DB] Continuing development startup despite migration warning.");
        }
        else
        {
            logger.LogWarning("[MySpot DB] Warning: Migration encountered an issue in production. Web server continuing startup so health checks remain accessible.");
        }
    }
}

// Forward proxy headers (Render, Cloudflare, Nginx, AWS ALB)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
});

// Enable Swagger in Development OR if ENABLE_SWAGGER=true (default enabled for easy API exploration)
var enableSwagger = builder.Environment.IsDevelopment()
    || string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase)
    || builder.Configuration.GetValue<bool>("EnableSwagger", true);

if (enableSwagger)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MySpot API v1");
        c.RoutePrefix = "swagger";
    });
}

// Static files support
app.UseStaticFiles();

// CORS middleware
app.UseCors("WebClient");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint for cloud platforms (Render, Railway, AWS, Docker)
app.MapHealthChecks("/health");

// Friendly root status endpoint
app.MapGet("/", () => Results.Ok(new
{
    status = "healthy",
    service = "MySpot Smart Sports Booking API",
    version = "1.0.0",
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName
}));

// Map controller endpoints.
app.MapControllers();

// Start the application.
app.Run();

/// <summary>
/// Robust cross-platform .env loader that searches current directory, project directory,
/// parent directories, and base directories to support Windows, macOS, and Linux workflows.
/// </summary>
public static class DotEnvLoader
{
    public static void Load()
    {
        if (string.Equals(
                Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
                "Production",
                StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var candidateDirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var currentDir = Directory.GetCurrentDirectory();
        candidateDirs.Add(currentDir);
        candidateDirs.Add(Path.Combine(currentDir, "backend", "SmartSports.Api"));

        var dir = new DirectoryInfo(currentDir);
        for (int i = 0; i < 4 && dir.Parent != null; i++)
        {
            dir = dir.Parent;
            candidateDirs.Add(dir.FullName);
            candidateDirs.Add(Path.Combine(dir.FullName, "backend", "SmartSports.Api"));
        }

        var baseDir = new DirectoryInfo(AppContext.BaseDirectory);
        candidateDirs.Add(baseDir.FullName);
        for (int i = 0; i < 4 && baseDir.Parent != null; i++)
        {
            baseDir = baseDir.Parent;
            candidateDirs.Add(baseDir.FullName);
            candidateDirs.Add(Path.Combine(baseDir.FullName, "backend", "SmartSports.Api"));
        }

        string? loadedPath = null;
        foreach (var candidate in candidateDirs)
        {
            var envFile = Path.Combine(candidate, ".env");
            if (File.Exists(envFile))
            {
                try
                {
                    foreach (var line in File.ReadAllLines(envFile))
                    {
                        var trimmed = line.Trim();
                        if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#")) continue;

                        if (trimmed.StartsWith("export ", StringComparison.OrdinalIgnoreCase))
                        {
                            trimmed = trimmed.Substring(7).Trim();
                        }

                        var separatorIdx = trimmed.IndexOf('=');
                        if (separatorIdx > 0)
                        {
                            var key = trimmed.Substring(0, separatorIdx).Trim();
                            var val = trimmed.Substring(separatorIdx + 1).Trim();
                            if ((val.StartsWith("\"") && val.EndsWith("\"")) || (val.StartsWith("'") && val.EndsWith("'")))
                            {
                                val = val.Length >= 2 ? val.Substring(1, val.Length - 2) : "";
                            }

                            Environment.SetEnvironmentVariable(key, val);
                        }
                    }
                    loadedPath = envFile;
                    Console.WriteLine($"[MySpot Config] Loaded environment configuration from: {envFile}");
                    break;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[MySpot Config] Error reading {envFile}: {ex.Message}");
                }
            }
        }

        if (loadedPath == null)
        {
            Console.WriteLine("[MySpot Config] Notice: No .env file found. Using system environment variables or appsettings.json.");
        }

        // ASP.NET Core defaults to Production when no environment is supplied.
        // Local development should set ASPNETCORE_ENVIRONMENT explicitly.
    }
}

/// <summary>
/// Cloud-ready connection string resolver that translates standard URI formats
/// (postgres:// or postgresql://) from Neon, Render, Railway, Supabase, etc.
/// into ADO.NET Npgsql connection strings with SSL enabled.
/// </summary>
public static class ConnectionStringHelper
{
    public static string ResolvePostgresConnectionString(string? rawInput)
    {
        if (string.IsNullOrWhiteSpace(rawInput)) return string.Empty;

        rawInput = rawInput.Trim();

        // Handle URI formats: postgres:// or postgresql://
        if (rawInput.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            rawInput.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(rawInput);
                var userInfo = uri.UserInfo.Split(':');
                var username = Uri.UnescapeDataString(userInfo[0]);
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
                var host = uri.Host;
                var port = uri.Port > 0 ? uri.Port : 5432;
                var database = uri.AbsolutePath.TrimStart('/');

                var builder = new Npgsql.NpgsqlConnectionStringBuilder
                {
                    Host = host,
                    Port = port,
                    Database = database,
                    Username = username,
                    Password = password,
                    SslMode = Npgsql.SslMode.Require,
                    Pooling = true
                };

                // Parse query parameters if any (e.g. ?sslmode=require)
                if (!string.IsNullOrEmpty(uri.Query))
                {
                    var query = uri.Query.TrimStart('?');
                    foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
                    {
                        var parts = pair.Split('=');
                        if (parts.Length == 2)
                        {
                            var key = parts[0].Trim().ToLowerInvariant();
                            var val = parts[1].Trim().ToLowerInvariant();
                            if (key == "sslmode" && val == "disable")
                            {
                                builder.SslMode = Npgsql.SslMode.Disable;
                            }
                        }
                    }
                }

                return builder.ConnectionString;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MySpot DB] Notice: Fallback on URI parsing: {ex.Message}. Using raw connection string.");
                return rawInput;
            }
        }

        // If it's already an ADO.NET connection string (Host=...;Database=...)
        // When connecting to cloud postgres providers, ensure SSL is enabled if not already present
        if (!rawInput.Contains("SslMode", StringComparison.OrdinalIgnoreCase) &&
            !rawInput.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase))
        {
            if (rawInput.Contains(".neon.tech", StringComparison.OrdinalIgnoreCase) ||
                rawInput.Contains(".render.com", StringComparison.OrdinalIgnoreCase) ||
                rawInput.Contains(".supabase.co", StringComparison.OrdinalIgnoreCase) ||
                rawInput.Contains("railway.app", StringComparison.OrdinalIgnoreCase) ||
                rawInput.Contains("amazonaws.com", StringComparison.OrdinalIgnoreCase))
            {
                rawInput += ";SSL Mode=Require;Trust Server Certificate=true;";
            }
        }

        return rawInput;
    }
}