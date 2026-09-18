//Import JWT Authentication
using Microsoft.AspNetCore.Authentication.JwtBearer;//JWT Bearer authentication
using Microsoft.IdentityModel.Tokens; //Validate and verify JWT tokens.
using System.Text; //Convert the JWT key to bytes.

// Import Entity Framework Core functionality.
using Microsoft.EntityFrameworkCore;

// Import our application's database context.
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Services;
using SmartSportsFacilityBooking.AI.Contracts;
using SmartSportsFacilityBooking.AI.Tools;
using SmartSportsFacilityBooking.AI.Agents;
using SmartSportsFacilityBooking.AI.Orchestration;

using System.Text.Json.Serialization;
// Create the application builder.
var builder = WebApplication.CreateBuilder(args);

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("JWT key is not configured. Set the JWT_KEY environment variable.");
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

//CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("WebClient", policy => policy
        .SetIsOriginAllowed(origin => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// Register Allow-Listed AI Tools
builder.Services.AddScoped<ITool, SearchFacilitiesTool>();
builder.Services.AddScoped<ITool, GetFacilityDetailsTool>();
builder.Services.AddScoped<ITool, CheckScheduleConflictTool>();
builder.Services.AddScoped<ITool, ValidateBusinessRulesTool>();
builder.Services.AddScoped<ITool, StageBookingProposalTool>();
builder.Services.AddScoped<ITool, CommitBookingActionTool>();
builder.Services.AddScoped<IToolRegistry, DefaultToolRegistry>();

// Register 4 Specialized Agents
builder.Services.AddScoped<PlanningCoordinationAgent>();
builder.Services.AddScoped<FacilityAnalysisAgent>();
builder.Services.AddScoped<DeterministicValidationAgent>();
builder.Services.AddScoped<ActionExecutionAgent>();

// Register Orchestrator & Workflow Service
builder.Services.AddScoped<AgenticWorkflowOrchestrator>();
builder.Services.AddScoped<BookingWorkflowService>();

// Register OTP & Email Services
builder.Services.AddSingleton<SmartSportsFacilityBooking.Services.OtpStore>();
builder.Services.AddScoped<SmartSportsFacilityBooking.Services.EmailService>();


// Add controller support to the application.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Register Entity Framework Core with the dependency injection container.
builder.Services.AddDbContext<AppDbContext>(options =>
    // Configure Entity Framework Core to use PostgreSQL.
    options.UseNpgsql(
        Environment.GetEnvironmentVariable("SMARTSPORTS_DB_CONNECTION")
            ?? builder.Configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=SmartSportsBookingDb;Username=postgres;Password=Niru2356"
    )
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
        }
        AppDbContext.SeedFacilities(dbContext);
        AppDbContext.SeedDashboardData(dbContext);
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Database migration/seed failed. The API can continue to start without a reachable PostgreSQL instance.");
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