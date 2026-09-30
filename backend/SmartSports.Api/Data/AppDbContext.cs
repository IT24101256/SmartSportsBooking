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
    public DbSet<BookingEquipmentPayment> BookingEquipmentPayments => Set<BookingEquipmentPayment>();
    public DbSet<Equipment> Equipments => Set<Equipment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Equipment>()
            .HasOne(e => e.Facility)
            .WithMany()
            .HasForeignKey(e => e.FacilityId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<BookingEquipmentPayment>()
            .HasOne(p => p.Booking)
            .WithMany(b => b.EquipmentPayments)
            .HasForeignKey(p => p.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

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
            new Facility { Name = "Cricket Ground", Description = "A full-size cricket ground for matches and training.", HourlyRate = 6500, Faq = "[{\"question\":\"Can teams book the ground?\",\"answer\":\"Yes, team and individual bookings are supported.\"}]", IsAvailable = true, CourtType = "Outdoor", EquipmentsProvided = "[{\"name\":\"Kashmir Willow Bats\",\"hourlyRate\":500},{\"name\":\"Red Leather Match Balls (Box of 2)\",\"hourlyRate\":400},{\"name\":\"Practice Stumps & Wickets\",\"hourlyRate\":250},{\"name\":\"Full Batting Pads & Gloves Set\",\"hourlyRate\":350},{\"name\":\"Protective Helmets\",\"hourlyRate\":200}]" },
            new Facility { Name = "Badminton Court", Description = "Indoor court with tournament-quality flooring.", HourlyRate = 1200, Faq = "[{\"question\":\"Are rackets provided?\",\"answer\":\"Equipment availability depends on the selected session.\"}]", IsAvailable = true, CourtType = "Indoor", EquipmentsProvided = "[{\"name\":\"Yonex Carbon Rackets (Pair)\",\"hourlyRate\":300},{\"name\":\"Tournament Feather Shuttlecocks (Tube)\",\"hourlyRate\":400},{\"name\":\"Badminton Net\",\"hourlyRate\":200},{\"name\":\"Training Grip Tape & Powder\",\"hourlyRate\":150}]" },
            new Facility { Name = "Football Field", Description = "Floodlit football field for training and competitive games.", HourlyRate = 4500, Faq = "[{\"question\":\"Does the rate include lighting?\",\"answer\":\"Yes, standard lighting is included.\"}]", IsAvailable = true, CourtType = "Outdoor", EquipmentsProvided = "[{\"name\":\"FIFA Quality Pro Match Balls\",\"hourlyRate\":300},{\"name\":\"Training Bibs Set (10 pcs)\",\"hourlyRate\":200},{\"name\":\"Agility Hurdles & Cones Set\",\"hourlyRate\":250},{\"name\":\"Goalkeeper Gloves (Pair)\",\"hourlyRate\":250}]" },
            new Facility { Name = "Indoor Basketball Arena", Description = "Professional indoor basketball arena with spectator seating.", HourlyRate = 3000, Faq = "[{\"question\":\"How many players can use the arena?\",\"answer\":\"The arena supports standard five-a-side basketball sessions.\"}]", IsAvailable = true, CourtType = "Indoor", EquipmentsProvided = "[{\"name\":\"Spalding Official Leather Basketballs\",\"hourlyRate\":300},{\"name\":\"Electronic Shot Clock Remote\",\"hourlyRate\":400},{\"name\":\"Training Cones & Markers\",\"hourlyRate\":150}]" },
            new Facility { Name = "Swimming Pool", Description = "A maintained swimming pool for lessons, fitness, and recreation.", HourlyRate = 2000, Faq = "[{\"question\":\"Are swimming lanes available?\",\"answer\":\"Lane availability is shown during booking.\"}]", IsAvailable = true, CourtType = "Outdoor", EquipmentsProvided = "[{\"name\":\"Competition Kickboards & Pull Buoys\",\"hourlyRate\":200},{\"name\":\"Swim Fins Set\",\"hourlyRate\":250},{\"name\":\"Water Polo Balls\",\"hourlyRate\":250},{\"name\":\"Lane Divider Set\",\"hourlyRate\":300}]" },
            new Facility { Name = "Table Tennis Court", Description = "Indoor table tennis space for casual and competitive play.", HourlyRate = 1000, Faq = "[{\"question\":\"Are bats and balls included?\",\"answer\":\"Basic equipment can be requested at reception.\"}]", IsAvailable = true, CourtType = "Indoor", EquipmentsProvided = "[{\"name\":\"Stiga Competition Paddles (Pair)\",\"hourlyRate\":200},{\"name\":\"ITTF 3-Star Balls (Pack of 3)\",\"hourlyRate\":150},{\"name\":\"ITTF Regulation Net & Post Set\",\"hourlyRate\":150}]" },
            new Facility { Name = "Volleyball Court", Description = "Outdoor volleyball court suitable for training and matches.", HourlyRate = 2800, Faq = "[{\"question\":\"Can the court be reserved for tournaments?\",\"answer\":\"Yes, contact the facilities team for tournament arrangements.\"}]", IsAvailable = true, CourtType = "Outdoor", EquipmentsProvided = "[{\"name\":\"Mikasa Official Match Volleyballs\",\"hourlyRate\":250},{\"name\":\"Antennae & Boundary Lines\",\"hourlyRate\":200},{\"name\":\"Ball Cart\",\"hourlyRate\":150}]" }
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
                existing.EquipmentsProvided = def.EquipmentsProvided;
                if (string.IsNullOrWhiteSpace(existing.CourtType))
                {
                    existing.CourtType = def.CourtType;
                }
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

    public static void SeedEquipments(AppDbContext context)
    {
        if (context.Equipments.Any())
        {
            return;
        }

        var defaultEquipments = new[]
        {
            // Badminton
            new Equipment { Name = "Yonex Carbon Rackets (Pair)", SportCategory = "Badminton", HourlyRate = 300, TotalStock = 20, Description = "High-tension tournament carbon fiber racket pair", IsAvailable = true },
            new Equipment { Name = "Tournament Feather Shuttlecocks (Tube)", SportCategory = "Badminton", HourlyRate = 400, TotalStock = 30, Description = "Official BWF speed-77 goose feather shuttlecocks (12 pack)", IsAvailable = true },
            new Equipment { Name = "Badminton Training Net", SportCategory = "Badminton", HourlyRate = 200, TotalStock = 8, Description = "Heavy-duty tournament mesh court net", IsAvailable = true },
            new Equipment { Name = "Grip Wrap & Anti-Slip Powder Set", SportCategory = "Badminton", HourlyRate = 150, TotalStock = 40, Description = "Absorbent towel grips and magnesium grip powder", IsAvailable = true },

            // Cricket
            new Equipment { Name = "Kashmir Willow Bats (Senior)", SportCategory = "Cricket", HourlyRate = 500, TotalStock = 15, Description = "Handcrafted premium willow bat with protective toe guard", IsAvailable = true },
            new Equipment { Name = "Red Leather Match Balls (Box of 2)", SportCategory = "Cricket", HourlyRate = 400, TotalStock = 25, Description = "Grade-A alum-tanned 4-piece leather match balls", IsAvailable = true },
            new Equipment { Name = "Practice Stumps & Bails Set", SportCategory = "Cricket", HourlyRate = 250, TotalStock = 10, Description = "Spring-loaded target wickets and zinc bails", IsAvailable = true },
            new Equipment { Name = "Full Batting Pads & Gloves Set", SportCategory = "Cricket", HourlyRate = 350, TotalStock = 12, Description = "Moulded cane legguards and split-finger sausage gloves", IsAvailable = true },
            new Equipment { Name = "Protective Cricket Helmet", SportCategory = "Cricket", HourlyRate = 200, TotalStock = 15, Description = "Titanium grill safety helmet for pace bowling", IsAvailable = true },

            // Football
            new Equipment { Name = "FIFA Quality Pro Match Balls", SportCategory = "Football", HourlyRate = 300, TotalStock = 20, Description = "Thermally bonded FIFA Pro official match ball size 5", IsAvailable = true },
            new Equipment { Name = "Training Bibs Set (10 Pack)", SportCategory = "Football", HourlyRate = 200, TotalStock = 15, Description = "Breathable neon scrimmage bibs for squad drills", IsAvailable = true },
            new Equipment { Name = "Agility Ladder & Training Cones", SportCategory = "Football", HourlyRate = 250, TotalStock = 10, Description = "6m coordination ladder and 20 marker saucer cones", IsAvailable = true },
            new Equipment { Name = "Pro Goalkeeper Gloves (Pair)", SportCategory = "Football", HourlyRate = 250, TotalStock = 8, Description = "4mm German latex foam negative cut match gloves", IsAvailable = true },

            // Basketball
            new Equipment { Name = "Spalding Official Leather Basketball", SportCategory = "Basketball", HourlyRate = 300, TotalStock = 18, Description = "Composite leather FIBA certified indoor game ball", IsAvailable = true },
            new Equipment { Name = "Electronic Shot Clock Remote & Whistle", SportCategory = "Basketball", HourlyRate = 400, TotalStock = 5, Description = "Handheld 24-second buzzer system and coach whistle", IsAvailable = true },
            new Equipment { Name = "Court Marker Cones & Agility Spots", SportCategory = "Basketball", HourlyRate = 150, TotalStock = 12, Description = "Flat non-slip rubber court markers and training cones", IsAvailable = true },

            // Swimming
            new Equipment { Name = "Competition Kickboard & Pull Buoy Set", SportCategory = "Swimming", HourlyRate = 200, TotalStock = 25, Description = "High-density EVA foam buoyant stroke training tools", IsAvailable = true },
            new Equipment { Name = "Hydrodynamic Swim Fins Set", SportCategory = "Swimming", HourlyRate = 250, TotalStock = 15, Description = "Silicone dual-flex propulsion fins for lap training", IsAvailable = true },
            new Equipment { Name = "Water Polo Match Ball", SportCategory = "Swimming", HourlyRate = 250, TotalStock = 10, Description = "Grip-treated waterproof competition water polo ball", IsAvailable = true },

            // Tennis
            new Equipment { Name = "Wilson Pro Staff Tennis Rackets (Pair)", SportCategory = "Tennis", HourlyRate = 350, TotalStock = 16, Description = "Graphite composite balanced tennis rackets with synthetic gut strings", IsAvailable = true },
            new Equipment { Name = "Championship Tennis Balls (Can of 3)", SportCategory = "Tennis", HourlyRate = 250, TotalStock = 30, Description = "Pressurized extra duty felt tournament tennis balls", IsAvailable = true },
            new Equipment { Name = "Tennis Ball Collector Hopper", SportCategory = "Tennis", HourlyRate = 200, TotalStock = 6, Description = "Portable 72-ball pickup wire basket", IsAvailable = true },

            // Table Tennis
            new Equipment { Name = "Stiga Competition Paddles (Pair)", SportCategory = "Table Tennis", HourlyRate = 200, TotalStock = 20, Description = "5-ply offensive carbon blades with ITTF approved tacky rubber", IsAvailable = true },
            new Equipment { Name = "ITTF 3-Star Balls (Pack of 6)", SportCategory = "Table Tennis", HourlyRate = 150, TotalStock = 40, Description = "40+ seamless tournament grade poly balls", IsAvailable = true },
            new Equipment { Name = "ITTF Regulation Net & Post Set", SportCategory = "Table Tennis", HourlyRate = 150, TotalStock = 8, Description = "Heavy clamp screw-on tension adjustable net kit", IsAvailable = true },

            // Volleyball
            new Equipment { Name = "Mikasa Official Match Volleyball", SportCategory = "Volleyball", HourlyRate = 250, TotalStock = 15, Description = "18-panel dimpled composite microfiber official ball", IsAvailable = true },
            new Equipment { Name = "Antennae & Boundary Guidelines", SportCategory = "Volleyball", HourlyRate = 200, TotalStock = 6, Description = "Fiberglass side antennas and velcro fastening court tape", IsAvailable = true },
            new Equipment { Name = "Heavy-Duty Ball Carrying Cart", SportCategory = "Volleyball", HourlyRate = 150, TotalStock = 5, Description = "Collapsible wheeled 24-ball hammock cart", IsAvailable = true },

            // Fitness & Other
            new Equipment { Name = "Resistance Bands & Kettlebell Set", SportCategory = "Fitness", HourlyRate = 300, TotalStock = 12, Description = "Loop resistance bands (5 strengths) and cast iron kettlebells", IsAvailable = true },
            new Equipment { Name = "Gym Training Dumbbells (Pair)", SportCategory = "Fitness", HourlyRate = 250, TotalStock = 15, Description = "Rubber encased hex dumbbells (5kg - 20kg available)", IsAvailable = true }
        };

        context.Equipments.AddRange(defaultEquipments);
        context.SaveChanges();
    }
}
