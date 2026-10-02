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

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    if (builder.Environment.IsDevelopment())
    {
        jwtKey = "local-development-only-signing-key-change-before-deployment-1234567890";
        Console.WriteLine("[MySpot Auth] Using local development JWT fallback key.");
    }
    else
    {
        throw new InvalidOperationException("JWT key is not configured. Set the JWT_KEY environment variable.");
    }
}

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? builder.Configuration["Jwt:Issuer"]
    ?? "SmartSports.Api";

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? builder.Configuration["Jwt:Audience"]
    ?? "SmartSports.Client";

//Add JWT Authentication
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

//Add Authorization
builder.Services.AddAuthorization();

// CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy =>
    {
        var configuredOrigins = (Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS")
                ?? builder.Configuration["Cors:AllowedOrigins"]
                ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (configuredOrigins.Length > 0)
        {
            policy.WithOrigins(configuredOrigins);
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(_ => true);
        }
        else
        {
            throw new InvalidOperationException("CORS_ALLOWED_ORIGINS must be configured outside Development.");
        }

        policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials();
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

// Register Entity Framework Core with the dependency injection container.
var dbConnectionString = Environment.GetEnvironmentVariable("SMARTSPORTS_DB_CONNECTION")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(dbConnectionString))
{
    if (builder.Environment.IsDevelopment())
    {
        dbConnectionString = "Host=localhost;Port=5432;Database=SmartSportsBookingDb;Username=postgres;Password=your_password";
    }
    else
    {
        throw new InvalidOperationException("Database connection is not configured. Set SMARTSPORTS_DB_CONNECTION.");
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

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        dbContext.Database.Migrate();
        AppDbContext.SeedRoles(dbContext);
        if (app.Environment.IsDevelopment())
        {
            AppDbContext.SeedDevelopmentAdmin(dbContext);
            AppDbContext.SeedDevelopmentManager(dbContext);
        }
        AppDbContext.SeedFacilities(dbContext);
        AppDbContext.SeedEquipments(dbContext);
        AppDbContext.SeedDashboardData(dbContext);
    }
    catch (Exception ex)
    {
        if (!app.Environment.IsDevelopment())
        {
            throw;
        }

        logger.LogWarning(ex, "Database migration/seed failed during Development startup.");
    }
}

// Check whether the application is running in the Development environment.
if (app.Environment.IsDevelopment())
{
    // Enable Swagger JSON generation.
    app.UseSwagger();

    // Enable the Swagger user interface.
    app.UseSwaggerUI();
}

// Redirect HTTP requests to HTTPS.
app.UseHttpsRedirection();

app.UseCors("WebClient");

app.UseAuthentication();
app.UseAuthorization();

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