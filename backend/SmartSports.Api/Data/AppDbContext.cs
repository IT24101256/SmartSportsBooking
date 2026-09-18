// This namespace contains the database context.
namespace SmartSportsFacilityBooking.Data;

// Import Entity Framework Core.
using Microsoft.EntityFrameworkCore;
  
// Import application models.
using SmartSportsFacilityBooking.Models;

// This class represents the application's database context.
public class AppDbContext : DbContext
{
    // This constructor receives database configuration options.
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    // This represents the Users database table.
    public DbSet<User> Users => Set<User>();

    // This represents the Roles database table.
    public DbSet<Role> Roles => Set<Role>();

    // This represents the Facilities database table.
    public DbSet<Facility> Facilities => Set<Facility>();

    // This represents the FacilitySchedules database table.
    public DbSet<FacilitySchedule> FacilitySchedules => Set<FacilitySchedule>();

    public DbSet<ScheduleEvent> ScheduleEvents => Set<ScheduleEvent>();

    public DbSet<SupportRequest> SupportRequests => Set<SupportRequest>();

    // This represents the Bookings database table.
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingWorkflow> BookingWorkflows => Set<BookingWorkflow>();
    public DbSet<BookingWorkflowStep> BookingWorkflowSteps => Set<BookingWorkflowStep>();
    public DbSet<BookingWorkflowAuditEvent> BookingWorkflowAuditEvents => Set<BookingWorkflowAuditEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<BookingWorkflow>()
            .HasIndex(w => w.WorkflowId)
            .IsUnique();

        modelBuilder.Entity<BookingWorkflow>()
            .HasOne(w => w.Customer)
            .WithMany()
            .HasForeignKey(w => w.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BookingWorkflowStep>()
            .HasOne(s => s.BookingWorkflow)
            .WithMany(w => w.Steps)
            .HasForeignKey(s => s.BookingWorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BookingWorkflowAuditEvent>()
            .HasOne(a => a.BookingWorkflow)
            .WithMany(w => w.AuditEvents)
            .HasForeignKey(a => a.BookingWorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SupportRequest>()
            .HasOne(request => request.User)
            .WithMany(user => user.SupportRequests)
            .HasForeignKey(request => request.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Customer" },
            new Role { Id = 2, Name = "Staff" },
            new Role { Id = 3, Name = "Manager" },
            new Role { Id = 4, Name = "Admin" }
        );
    }

    public static void SeedRoles(AppDbContext context)
    {
        var defaultRoles = new[]
        {
            "Customer",
            "Staff",
            "Manager",
            "Admin"
        };

        foreach (var roleName in defaultRoles)
        {
            if (!context.Roles.Any(r => r.Name == roleName))
            {
                context.Roles.Add(new Role { Name = roleName });
            }
        }

        context.SaveChanges();
    }

    public static void SeedDevelopmentAdmin(AppDbContext context)
    {
        if (context.Users.Any(user => user.Email == "admin@smartsports.com"))
        {
            return;
        }

        var adminRole = context.Roles.Single(role => role.Name == "Admin");
        context.Users.Add(new User
        {
            FullName = "Admin User",
            Email = "admin@smartsports.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            RoleId = adminRole.Id
        });
        context.SaveChanges();
    }

    public static void SeedFacilities(AppDbContext context)
    {
        var defaultFacilities = new[]
        {
            new Facility { Name = "Championship Turf", Type = "Football", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Skyline Court", Type = "Badminton", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Aqua Arena", Type = "Swimming", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Riverside Tennis Club", Type = "Tennis", Location = "Riverside grounds", IsAvailable = true },
            new Facility { Name = "Performance Gym", Type = "Fitness", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Indoor Basketball Arena", Type = "Basketball", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Volleyball Court", Type = "Volleyball", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Table Tennis Court", Type = "Table Tennis", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Squash Court", Type = "Squash", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Swimming Pool", Type = "Swimming", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Football Field", Type = "Football", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Cricket Ground", Type = "Cricket", Location = "Main sports complex", IsAvailable = true },
            new Facility { Name = "Badminton Court", Type = "Badminton", Location = "Main sports complex", IsAvailable = true }
        };

        var existingFacilities = context.Facilities.ToList();
        var existingDict = existingFacilities.ToDictionary(f => f.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var def in defaultFacilities)
        {
            if (existingDict.TryGetValue(def.Name, out var existing))
            {
                existing.Type = def.Type;
                existing.Location = def.Location;
                existing.IsAvailable = def.IsAvailable;
            }
            else
            {
                context.Facilities.Add(def);
            }
        }

        context.SaveChanges();

        var facilities = context.Facilities.ToList();
        var scheduleExists = context.FacilitySchedules
            .Select(schedule => schedule.FacilityId)
            .ToHashSet();

        var missingSchedules = facilities
            .Where(facility => !scheduleExists.Contains(facility.Id))
            .Select(facility => new FacilitySchedule
            {
                FacilityId = facility.Id,
                DayOfWeek = DayOfWeek.Monday,
                StartTime = new TimeSpan(6, 0, 0),
                EndTime = new TimeSpan(22, 0, 0)
            })
            .ToArray();

        if (missingSchedules.Length > 0)
        {
            context.FacilitySchedules.AddRange(missingSchedules);
            context.SaveChanges();
        }
    }

    public static void SeedDashboardData(AppDbContext context)
    {
            var eventDate = new DateTime(2026, 9, 10, 0, 0, 0, DateTimeKind.Utc);
            var defaultEvents = new[]
            {
                new ScheduleEvent { EventDate = eventDate, StartTime = new TimeSpan(9, 0, 0), Title = "Basketball training", Coach = "Coach Liam" },
                new ScheduleEvent { EventDate = eventDate, StartTime = new TimeSpan(11, 30, 0), Title = "Tennis clinic", Coach = "Coach Maya" },
                new ScheduleEvent { EventDate = eventDate, StartTime = new TimeSpan(19, 0, 0), Title = "Community match", Coach = "Captain team" }
            };

        var existingEventKeys = context.ScheduleEvents
            .Select(item => new { item.EventDate, item.StartTime, item.Title })
            .ToHashSet();

        var missingEvents = defaultEvents
            .Where(item => !existingEventKeys.Contains(new { item.EventDate, item.StartTime, item.Title }))
            .ToArray();

        if (missingEvents.Length > 0)
        {
            context.ScheduleEvents.AddRange(missingEvents);
        }

        var defaultRequests = new[]
        {
            new SupportRequest { Title = "Booking issue", Detail = "Need to change the time for Friday match", Priority = "Medium" },
            new SupportRequest { Title = "Membership query", Detail = "Checking reward points balance", Priority = "Low" },
            new SupportRequest { Title = "Facility request", Detail = "Request for extra lighting on court 5", Priority = "High" }
        };

        var existingRequestKeys = context.SupportRequests
            .Select(item => new { item.Title, item.Detail })
            .ToHashSet();

        var missingRequests = defaultRequests
            .Where(item => !existingRequestKeys.Contains(new { item.Title, item.Detail }))
            .ToArray();

        if (missingRequests.Length > 0)
        {
            context.SupportRequests.AddRange(missingRequests);
        }

        if (missingEvents.Length > 0 || missingRequests.Length > 0)
        {
            context.SaveChanges();
        }
    }
}
