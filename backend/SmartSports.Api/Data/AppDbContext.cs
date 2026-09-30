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
    public DbSet<SupportMessage> SupportMessages => Set<SupportMessage>();
    public DbSet<FacilityRating> FacilityRatings => Set<FacilityRating>();
    public DbSet<BookingReview> BookingReviews => Set<BookingReview>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();

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

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasIndex(b => b.BookingDate)
                .HasDatabaseName("IX_Bookings_BookingDate");

            entity.HasIndex(b => b.Status)
                .HasDatabaseName("IX_Bookings_Status");

            entity.HasIndex(b => b.FacilityId)
                .HasDatabaseName("IX_Bookings_FacilityId");

            entity.HasIndex(b => b.IsRescheduleRequested)
                .HasDatabaseName("IX_Bookings_IsRescheduleRequested");

            entity.HasIndex(b => b.RefundStatus)
                .HasDatabaseName("IX_Bookings_RefundStatus");

            entity.HasIndex(b => new { b.Status, b.BookingDate })
                .HasDatabaseName("IX_Bookings_Status_BookingDate");

            entity.HasIndex(b => new { b.FacilityId, b.BookingDate })
                .HasDatabaseName("IX_Bookings_FacilityId_BookingDate");

            entity.HasIndex(b => new { b.RefundStatus, b.BookingDate })
                .HasDatabaseName("IX_Bookings_RefundStatus_BookingDate");

            entity.HasIndex(b => new { b.UserId, b.BookingDate })
                .HasDatabaseName("IX_Bookings_UserId_BookingDate");
        });

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

        modelBuilder.Entity<SupportMessage>()
            .HasOne(message => message.SupportRequest)
            .WithMany(request => request.Messages)
            .HasForeignKey(message => message.SupportRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SupportMessage>()
            .HasOne(message => message.SenderUser)
            .WithMany()
            .HasForeignKey(message => message.SenderUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<FacilityRating>()
            .HasOne(rating => rating.Facility)
            .WithMany()
            .HasForeignKey(rating => rating.FacilityId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FacilityRating>()
            .HasOne(rating => rating.User)
            .WithMany()
            .HasForeignKey(rating => rating.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FacilityRating>()
            .HasIndex(rating => new { rating.FacilityId, rating.UserId })
            .IsUnique();

        modelBuilder.Entity<BookingReview>()
            .HasOne(review => review.Booking)
            .WithOne()
            .HasForeignKey<BookingReview>(review => review.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<BookingReview>()
            .HasOne(review => review.User)
            .WithMany()
            .HasForeignKey(review => review.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BookingReview>()
            .HasIndex(review => review.BookingId)
            .IsUnique();

        modelBuilder.Entity<TeamMember>()
            .HasOne(member => member.OwnerUser)
            .WithMany()
            .HasForeignKey(member => member.OwnerUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TeamMember>()
            .HasIndex(member => new { member.OwnerUserId, member.Name })
            .IsUnique();

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

    public static void SeedDevelopmentManager(AppDbContext context)
    {
        if (context.Users.Any(user => user.Email == "manager@smartsports.com"))
        {
            return;
        }

        var managerRole = context.Roles.FirstOrDefault(role => role.Name == "Manager");
        if (managerRole == null)
        {
            managerRole = new Role { Name = "Manager" };
            context.Roles.Add(managerRole);
            context.SaveChanges();
        }

        context.Users.Add(new User
        {
            FullName = "Arena Manager",
            Email = "manager@smartsports.com",
            ContactNumber = "0771234567",
            NicNumber = "199012345678",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager@12345"),
            RoleId = managerRole.Id
        });
        context.SaveChanges();
    }


    public static void SeedFacilities(AppDbContext context)
    {
        var defaultFacilities = new[]
        {
            new Facility { Name = "Cricket Ground", Description = "A full-size cricket ground for matches and training.", HourlyRate = 6500, Faq = "[{\"question\":\"Can teams book the ground?\",\"answer\":\"Yes, team and individual bookings are supported.\"}]", IsAvailable = true },
            new Facility { Name = "Badminton Court", Description = "Indoor court with tournament-quality flooring.", HourlyRate = 1200, Faq = "[{\"question\":\"Are rackets provided?\",\"answer\":\"Equipment availability depends on the selected session.\"}]", IsAvailable = true },
            new Facility { Name = "Football Field", Description = "Floodlit football field for training and competitive games.", HourlyRate = 4500, Faq = "[{\"question\":\"Does the rate include lighting?\",\"answer\":\"Yes, standard lighting is included.\"}]", IsAvailable = true },
            new Facility { Name = "Indoor Basketball Arena", Description = "Professional indoor basketball arena with spectator seating.", HourlyRate = 3000, Faq = "[{\"question\":\"How many players can use the arena?\",\"answer\":\"The arena supports standard five-a-side basketball sessions.\"}]", IsAvailable = true },
            new Facility { Name = "Swimming Pool", Description = "A maintained swimming pool for lessons, fitness, and recreation.", HourlyRate = 2000, Faq = "[{\"question\":\"Are swimming lanes available?\",\"answer\":\"Lane availability is shown during booking.\"}]", IsAvailable = true },
            new Facility { Name = "Table Tennis Court", Description = "Indoor table tennis space for casual and competitive play.", HourlyRate = 1000, Faq = "[{\"question\":\"Are bats and balls included?\",\"answer\":\"Basic equipment can be requested at reception.\"}]", IsAvailable = true },
            new Facility { Name = "Volleyball Court", Description = "Outdoor volleyball court suitable for training and matches.", HourlyRate = 2800, Faq = "[{\"question\":\"Can the court be reserved for tournaments?\",\"answer\":\"Yes, contact the facilities team for tournament arrangements.\"}]", IsAvailable = true }
        };

        var existingFacilities = context.Facilities.ToList();
        var existingDict = existingFacilities.ToDictionary(f => f.Name, StringComparer.OrdinalIgnoreCase);
        var allowedNames = defaultFacilities.Select(facility => facility.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var obsoleteFacilities = existingFacilities
            .Where(facility => !allowedNames.Contains(facility.Name) && !context.Bookings.Any(booking => booking.FacilityId == facility.Id))
            .ToArray();
        if (obsoleteFacilities.Length > 0) context.Facilities.RemoveRange(obsoleteFacilities);

        foreach (var def in defaultFacilities)
        {
            if (existingDict.TryGetValue(def.Name, out var existing))
            {
                existing.IsAvailable = def.IsAvailable;
                existing.Description = def.Description;
                existing.HourlyRate = def.HourlyRate;
                existing.Faq = def.Faq;
                existing.Images = def.Images;
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
