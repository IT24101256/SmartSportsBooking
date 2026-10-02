using System.Data;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SmartSportsFacilityBooking.AI.Models;
using SmartSportsFacilityBooking.Data;
using SmartSportsFacilityBooking.Models;
using SmartSportsFacilityBooking.Services;

namespace SmartSportsFacilityBooking.AI.Services;

public class BookingWorkflowSupervisor : IBookingWorkflowSupervisor
{
    private const int MaxBankSlipBytes = 4 * 1024 * 1024;
    private readonly AppDbContext _context;
    private readonly IAiToolsService _toolsService;
    private readonly IGeminiClient _geminiClient;
    private readonly ILogger<BookingWorkflowSupervisor> _logger;
    private readonly IConfiguration _configuration;
    private readonly IBookingSlotValidationService _slotValidationService;

    public BookingWorkflowSupervisor(
        AppDbContext context,
        IAiToolsService toolsService,
        IGeminiClient geminiClient,
        ILogger<BookingWorkflowSupervisor> logger,
        IConfiguration configuration,
        IBookingSlotValidationService slotValidationService)
    {
        _context = context;
        _toolsService = toolsService;
        _geminiClient = geminiClient;
        _logger = logger;
        _configuration = configuration;
        _slotValidationService = slotValidationService;
    }

    public async Task<BookingWorkflowResponse> StartWorkflowAsync(int userId, string? initialGoal = null)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new UnauthorizedAccessException("User not found.");
        }

        var state = new BookingWorkflowState
        {
            WorkflowId = Guid.NewGuid(),
            CustomerId = userId,
            CustomerName = user.FullName ?? string.Empty,
            NicNumber = user.NicNumber ?? string.Empty,
            ContactNumber = user.ContactNumber ?? string.Empty,
            Status = "collecting_requirements",
            CurrentStep = 1
        };

        state.Trajectory.Add($"Supervisor initiated workflow {state.WorkflowId} for user {user.FullName}.");

        var workflowEntity = new BookingWorkflow
        {
            WorkflowId = state.WorkflowId,
            CustomerId = userId,
            Objective = initialGoal ?? "Book sports facility with AI",
            FacilityType = string.Empty,
            RequestedStart = DateTime.UtcNow,
            RequestedEnd = DateTime.UtcNow.AddHours(1),
            Guests = 1,
            Budget = 0,
            Status = "Planning",
            PlanJson = JsonSerializer.Serialize(state),
            ProposalJson = "{}",
            ValidationJson = "{}",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        workflowEntity.AuditEvents.Add(new BookingWorkflowAuditEvent
        {
            EventType = "WorkflowInitiated",
            Actor = user.FullName ?? "Customer",
            DetailsJson = JsonSerializer.Serialize(new { initialGoal }),
            OccurredAtUtc = DateTime.UtcNow
        });

        _context.BookingWorkflows.Add(workflowEntity);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(initialGoal))
        {
            return await ProcessMessageAsync(userId, state.WorkflowId, initialGoal);
        }

        return new BookingWorkflowResponse
        {
            WorkflowId = state.WorkflowId,
            Status = state.Status,
            CurrentStep = 1,
            Message = $"Hello {user.FullName}! I am your AI Booking Assistant. Which sport or court would you like to reserve (e.g. Badminton, Football, Cricket, Basketball, Swimming, Table Tennis, Volleyball)?",
            SuggestedOptions = new List<string> { "Badminton", "Football Field", "Cricket Ground", "Basketball Arena", "Swimming Pool", "Table Tennis" },
            Trajectory = state.Trajectory
        };
    }

    public async Task<BookingWorkflowResponse> ProcessMessageAsync(int userId, Guid workflowId, string message)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == workflowId);

        if (workflow == null)
        {
            return new BookingWorkflowResponse { Status = "failed", Message = "Booking workflow session not found." };
        }

        if (workflow.CustomerId != userId)
        {
            return new BookingWorkflowResponse { Status = "failed", Message = "Unauthorized: You do not own this booking workflow." };
        }

        var state = DeserializeState(workflow.PlanJson, workflow.WorkflowId, userId);

        if (state.ConfirmedBookingId.HasValue)
        {
            var existingBooking = await _context.Bookings
                .Include(b => b.Facility)
                .FirstOrDefaultAsync(b => b.Id == state.ConfirmedBookingId.Value && b.UserId == userId);

            if (existingBooking != null)
            {
                return new BookingWorkflowResponse
                {
                    WorkflowId = state.WorkflowId,
                    Status = "completed",
                    CurrentStep = 4,
                    Message = $"Booking #{existingBooking.Id} was already confirmed.",
                    BookingId = existingBooking.Id,
                    Booking = existingBooking,
                    Trajectory = state.Trajectory
                };
            }
        }
        state.Trajectory.Add($"User: \"{message.Trim()}\"");

        // Hard loop iteration limit protection (SE3090 Lab 05)
        int iterations = 0;
        const int maxIterations = 5;

        // Step 1: Supervisor extracts entities from message
        ExtractEntities(message, state);
        iterations++;

        // Step 2: Facility Agent resolution
        if (string.IsNullOrWhiteSpace(state.FacilityName) && !string.IsNullOrWhiteSpace(state.Sport))
        {
            await ResolveFacilityAgentAsync(state);
            iterations++;
        }

        // Step 3: Availability Agent check
        if (state.FacilityId.HasValue && !string.IsNullOrWhiteSpace(state.BookingDate) && iterations < maxIterations)
        {
            await CheckAvailabilityAgentAsync(state);
            iterations++;
        }

        if (iterations >= maxIterations)
        {
            state.Trajectory.Add($"Supervisor enforced hard iteration limit of {maxIterations} steps.");
        }

        // Step 4: Step advancement & validation
        EvaluateStepProgress(state);

        // Step 5: If any detail changed while awaiting confirmation, invalidate previous confirmation
        if (state.AwaitingConfirmation && state.MissingFields.Count > 0)
        {
            state.AwaitingConfirmation = false;
            state.Status = "collecting_requirements";
        }

        // Save updated state
        workflow.PlanJson = JsonSerializer.Serialize(state);
        workflow.FacilityType = state.FacilityName ?? state.Sport;
        workflow.UpdatedAtUtc = DateTime.UtcNow;

        workflow.Steps.Add(new BookingWorkflowStep
        {
            AgentName = "Supervisor",
            Responsibility = "Process User Input and Route Agents",
            InputJson = JsonSerializer.Serialize(new { message }),
            OutputJson = JsonSerializer.Serialize(new { step = state.CurrentStep, status = state.Status }),
            ToolsCalledJson = "[]",
            Status = "Completed",
            StartedAtUtc = DateTime.UtcNow,
            CompletedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // Step 6: Generate response
        return BuildWorkflowResponse(state);
    }

    public async Task<BookingWorkflowResponse> ConfirmAndCommitBookingAsync(int userId, ConfirmBookingWorkflowRequest request)
    {
        var workflow = await _context.BookingWorkflows
            .Include(w => w.Steps)
            .Include(w => w.AuditEvents)
            .FirstOrDefaultAsync(w => w.WorkflowId == request.WorkflowId);

        if (workflow == null)
        {
            return new BookingWorkflowResponse { Status = "failed", Message = "Workflow session not found." };
        }

        if (workflow.CustomerId != userId)
        {
            return new BookingWorkflowResponse { Status = "failed", Message = "Unauthorized: You do not own this booking workflow." };
        }

        var state = DeserializeState(workflow.PlanJson, workflow.WorkflowId, userId);

        // Step 1: Pre-condition verification
        if (!state.FacilityId.HasValue ||
            string.IsNullOrWhiteSpace(state.BookingDate) ||
            string.IsNullOrWhiteSpace(state.StartTime) ||
            state.HoursNeeded < 1)
        {
            return new BookingWorkflowResponse
            {
                WorkflowId = state.WorkflowId,
                Status = "collecting_requirements",
                CurrentStep = 1,
                Message = "Booking details are incomplete. Please specify the venue, date, and start time first."
            };
        }

        // Step 2: Validate player details
        if (string.IsNullOrWhiteSpace(state.CustomerName) ||
            !Regex.IsMatch(state.NicNumber.Trim(), @"^(\d{9}[VvXx]|\d{12})$") ||
            !Regex.IsMatch(state.ContactNumber.Trim(), @"^\d{10}$"))
        {
            state.CurrentStep = 2;
            return new BookingWorkflowResponse
            {
                WorkflowId = state.WorkflowId,
                Status = "collecting_requirements",
                CurrentStep = 2,
                Message = "Valid player details (Full Name, 10-digit Contact Number, and valid NIC) are required before booking confirmation."
            };
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        // Step 3: Re-validate slot availability immediately before commit (anti-race condition)
        if (!DateTime.TryParse(state.BookingDate, out var requestedDate) ||
            !TimeSpan.TryParse(state.StartTime, out var parsedStart))
        {
            return new BookingWorkflowResponse
            {
                WorkflowId = state.WorkflowId,
                Status = "collecting_requirements",
                CurrentStep = 1,
                Message = "The requested booking date or time is invalid. Please select another available slot."
            };
        }

        var slotValidation = await _slotValidationService.ValidateAsync(
            state.FacilityId.Value,
            requestedDate,
            parsedStart,
            state.HoursNeeded);

        if (!slotValidation.IsValid)
        {
            return new BookingWorkflowResponse
            {
                WorkflowId = state.WorkflowId,
                Status = "collecting_requirements",
                CurrentStep = 1,
                Message = slotValidation.ErrorMessage
            };
        }

        var facility = slotValidation.Facility!;
        var targetDate = slotValidation.BookingDate;
        var parsedEnd = slotValidation.EndTime;

        // Step 4: Validate payment credentials and commit booking (Booking Agent Execution)
        var paymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? state.PaymentMethod : request.PaymentMethod;
        if (!paymentMethod.Equals("Card", StringComparison.OrdinalIgnoreCase) &&
            !paymentMethod.Equals("BankTransfer", StringComparison.OrdinalIgnoreCase))
        {
            return new BookingWorkflowResponse
            {
                WorkflowId = state.WorkflowId,
                Status = "awaiting_confirmation",
                CurrentStep = 3,
                Message = "Payment validation failed: only Card or Bank Transfer is supported."
            };
        }

        var isMockPayment = false;
        var paymentStatus = "Pending";
        var bookingStatus = "Pending";
        string? bankSlipStoredName = null;

        if (paymentMethod.Equals("Card", StringComparison.OrdinalIgnoreCase))
        {
            var configuredMockCard = Regex.Replace(
                _configuration["AI_MOCK_CARD_NUMBER"] ?? _configuration["Ai:MockCardNumber"] ?? string.Empty,
                @"\D",
                string.Empty);
            var configuredMockCvv = _configuration["AI_MOCK_CARD_CVV"] ?? _configuration["Ai:MockCardCvv"];
            var mockPaymentsEnabled = bool.TryParse(
                _configuration["AI_ENABLE_MOCK_CARD_PAYMENTS"] ?? _configuration["Ai:EnableMockCardPayments"],
                out var enabled) && enabled;
            var submittedCard = Regex.Replace(request.CardNumber ?? string.Empty, @"\D", string.Empty);
            var submittedLastFour = Regex.Replace(request.CardLastFour ?? string.Empty, @"\D", string.Empty);
            var mockCardMatches = submittedCard.Length > 0
                ? string.Equals(submittedCard, configuredMockCard, StringComparison.Ordinal)
                : configuredMockCard.Length >= 4 &&
                  string.Equals(submittedLastFour, configuredMockCard[^4..], StringComparison.Ordinal);

            if (!mockPaymentsEnabled ||
                string.IsNullOrWhiteSpace(configuredMockCard) ||
                !mockCardMatches ||
                string.IsNullOrWhiteSpace(configuredMockCvv) ||
                !string.Equals(request.Cvv?.Trim(), configuredMockCvv.Trim(), StringComparison.Ordinal))
            {
                return new BookingWorkflowResponse
                {
                    WorkflowId = state.WorkflowId,
                    Status = "awaiting_confirmation",
                    CurrentStep = 3,
                    Message = "Payment validation failed: this deployment accepts only the configured mock test card."
                };
            }

            if ((submittedCard.Length > 0 && submittedCard.Length != 16) ||
                (submittedCard.Length == 0 && submittedLastFour.Length != 4) ||
                string.IsNullOrWhiteSpace(request.Cvv) ||
                !Regex.IsMatch(request.Cvv.Trim(), @"^\d{3}$"))
            {
                return new BookingWorkflowResponse
                {
                    WorkflowId = state.WorkflowId,
                    Status = "awaiting_confirmation",
                    CurrentStep = 3,
                    Message = "Payment validation failed: the configured mock card details are invalid."
                };
            }

            if (!request.ExpiryMonth.HasValue || request.ExpiryMonth.Value < 1 || request.ExpiryMonth.Value > 12 ||
                !request.ExpiryYear.HasValue || request.ExpiryYear.Value < DateTime.UtcNow.Year ||
                (request.ExpiryYear.Value == DateTime.UtcNow.Year && request.ExpiryMonth.Value < DateTime.UtcNow.Month))
            {
                return new BookingWorkflowResponse
                {
                    WorkflowId = state.WorkflowId,
                    Status = "awaiting_confirmation",
                    CurrentStep = 3,
                    Message = "Payment validation failed: the mock card expiry date is invalid or expired."
                };
            }

            isMockPayment = true;
            paymentStatus = "MockPaid";
            bookingStatus = "Confirmed";
        }
        else if (paymentMethod.Equals("BankTransfer", StringComparison.OrdinalIgnoreCase))
        {
            if (request.BankSlip == null && string.IsNullOrWhiteSpace(request.BankSlipBase64))
            {
                return new BookingWorkflowResponse
                {
                    WorkflowId = state.WorkflowId,
                    Status = "awaiting_confirmation",
                    CurrentStep = 3,
                    Message = "Payment validation failed: Please upload your bank transfer slip / receipt to complete your booking."
                };
            }

            try
            {
                var uploadsFolder = Path.Combine(AppContext.BaseDirectory, "uploads", "slips");
                Directory.CreateDirectory(uploadsFolder);

                if (request.BankSlip != null)
                {
                    if (request.BankSlip.Length <= 0 || request.BankSlip.Length > MaxBankSlipBytes)
                    {
                        return new BookingWorkflowResponse
                        {
                            WorkflowId = state.WorkflowId,
                            Status = "awaiting_confirmation",
                            CurrentStep = 3,
                            Message = "The bank slip must be a non-empty file no larger than 4 MB."
                        };
                    }

                    var signature = await ReadFileSignatureAsync(request.BankSlip);
                    var extension = DetectFileExtension(signature);
                    if (extension == null)
                    {
                        return new BookingWorkflowResponse
                        {
                            WorkflowId = state.WorkflowId,
                            Status = "awaiting_confirmation",
                            CurrentStep = 3,
                            Message = "The bank slip must be a valid JPG, PNG, or PDF file."
                        };
                    }

                    bankSlipStoredName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsFolder, bankSlipStoredName);
                    await using var stream = new FileStream(filePath, FileMode.Create);
                    await request.BankSlip.CopyToAsync(stream);
                }
                else if (!string.IsNullOrWhiteSpace(request.BankSlipBase64))
                {
                    var cleanBase64 = Regex.Replace(request.BankSlipBase64, @"^data:image\/[a-zA-Z]+;base64,", string.Empty);
                    var bytes = Convert.FromBase64String(cleanBase64);
                    if (bytes.Length <= 0 || bytes.Length > MaxBankSlipBytes)
                    {
                        throw new InvalidDataException("Bank slip exceeds the 4 MB limit.");
                    }

                    var extension = DetectFileExtension(bytes);
                    if (extension == null)
                    {
                        throw new InvalidDataException("Bank slip format is not supported.");
                    }

                    bankSlipStoredName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsFolder, bankSlipStoredName);
                    await File.WriteAllBytesAsync(filePath, bytes);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to store bank slip");
                return new BookingWorkflowResponse
                {
                    WorkflowId = state.WorkflowId,
                    Status = "awaiting_confirmation",
                    CurrentStep = 3,
                    Message = "Could not process bank slip upload. Please try uploading the image again."
                };
            }
        }

        string? cardLastFour = request.CardLastFour;
        if (string.IsNullOrWhiteSpace(cardLastFour) && !string.IsNullOrWhiteSpace(request.CardNumber) && request.CardNumber.Length >= 4)
        {
            var cleanCard = Regex.Replace(request.CardNumber, @"\D", string.Empty);
            cardLastFour = cleanCard.Length >= 4 ? cleanCard[^4..] : null;
        }

        var booking = new Booking
        {
            UserId = userId,
            FacilityId = state.FacilityId.Value,
            BookingDate = targetDate,
            StartTime = parsedStart,
            EndTime = parsedEnd,
            HoursNeeded = state.HoursNeeded,
            TotalAmount = facility.HourlyRate * state.HoursNeeded,
            CustomerName = state.CustomerName.Trim(),
            NicNumber = state.NicNumber.Trim(),
            ContactNumber = state.ContactNumber.Trim(),
            PaymentMethod = paymentMethod.Equals("Card", StringComparison.OrdinalIgnoreCase) ? "Card" : "BankTransfer",
            PaymentStatus = paymentStatus,
            IsMockPayment = isMockPayment,
            CardLastFour = cardLastFour,
            BankSlipFileName = bankSlipStoredName,
            Status = bookingStatus
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        // Step 5: Finalize Workflow State (Confirmation Agent)
        state.ConfirmedBookingId = booking.Id;
        state.Status = "completed";
        state.CurrentStep = 4;
        state.AwaitingConfirmation = false;
        state.Trajectory.Add($"Booking Agent committed booking ID #{booking.Id} successfully.");

        workflow.Status = "Approved";
        workflow.FinalOutcome = $"Booking #{booking.Id} confirmed for {facility.Name} on {state.BookingDate} at {state.StartTime}.";
        workflow.PlanJson = JsonSerializer.Serialize(state);
        workflow.ProposalJson = JsonSerializer.Serialize(new
        {
            bookingId = booking.Id,
            facility = facility.Name,
            total = booking.TotalAmount,
            status = booking.Status
        });

        workflow.AuditEvents.Add(new BookingWorkflowAuditEvent
        {
            EventType = "ApprovedAndCommitted",
            Actor = "AI Booking Agent",
            DetailsJson = JsonSerializer.Serialize(new { bookingId = booking.Id, total = booking.TotalAmount }),
            OccurredAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return new BookingWorkflowResponse
        {
            WorkflowId = state.WorkflowId,
            Status = "completed",
            CurrentStep = 4,
            Message = $"🎉 Booking Confirmed! Your reservation for {facility.Name} on {state.BookingDate} from {state.StartTime} to {parsedEnd:hh\\:mm} is successfully created (Booking #{booking.Id}). You can view your pass in your Bookings tab.",
            BookingId = booking.Id,
            Booking = new
            {
                booking.Id,
                FacilityName = facility.Name,
                Date = state.BookingDate,
                StartTime = state.StartTime,
                EndTime = parsedEnd.ToString(@"hh\:mm"),
                booking.HoursNeeded,
                booking.TotalAmount,
                booking.Status,
                booking.PaymentMethod,
                booking.PaymentStatus
            },
            Trajectory = state.Trajectory
        };
    }

    public async Task<BookingWorkflowResponse?> GetWorkflowStatusAsync(int userId, Guid workflowId)
    {
        var workflow = await _context.BookingWorkflows.FirstOrDefaultAsync(w => w.WorkflowId == workflowId && w.CustomerId == userId);
        if (workflow == null) return null;

        var state = DeserializeState(workflow.PlanJson, workflow.WorkflowId, userId);
        return BuildWorkflowResponse(state);
    }

    private static void ExtractEntities(string message, BookingWorkflowState state)
    {
        var lower = message.ToLowerInvariant();

        // 1. Sport extraction
        if (lower.Contains("badminton")) state.Sport = "Badminton";
        else if (lower.Contains("cricket")) state.Sport = "Cricket";
        else if (lower.Contains("football") || lower.Contains("soccer")) state.Sport = "Football";
        else if (lower.Contains("basketball")) state.Sport = "Basketball";
        else if (lower.Contains("swim") || lower.Contains("pool")) state.Sport = "Swimming";
        else if (lower.Contains("table tennis") || lower.Contains("ping pong")) state.Sport = "Table Tennis";
        else if (lower.Contains("volleyball")) state.Sport = "Volleyball";

        // 2. Date extraction
        var slNow = CancellationRefundService.GetCurrentLocalTime();
        if (lower.Contains("tomorrow"))
        {
            state.BookingDate = slNow.Date.AddDays(1).ToString("yyyy-MM-dd");
        }
        else if (lower.Contains("today"))
        {
            state.BookingDate = slNow.Date.ToString("yyyy-MM-dd");
        }
        else
        {
            var dateMatch = Regex.Match(message, @"\b(202\d[-/]\d{1,2}[-/]\d{1,2})\b");
            if (dateMatch.Success && DateTime.TryParse(dateMatch.Value, out var parsedDate))
            {
                state.BookingDate = parsedDate.ToString("yyyy-MM-dd");
            }
            else
            {
                var generalDate = Regex.Match(message, @"\b(\d{4}-\d{2}-\d{2})\b");
                if (generalDate.Success && DateTime.TryParse(generalDate.Value, out var gd))
                {
                    state.BookingDate = gd.ToString("yyyy-MM-dd");
                }
                else
                {
                    var altDate = Regex.Match(message, @"\b(\d{1,2}[-/]\d{1,2}[-/]202\d)\b");
                    if (altDate.Success && DateTime.TryParse(altDate.Value, out var ad))
                    {
                        state.BookingDate = ad.ToString("yyyy-MM-dd");
                    }
                }
            }
        }

        // 3. Time extraction & linear multi-slot duration extraction
        // Check for multiple slots mentioned, e.g. "slots 10:00, 11:00", "slots from 10:00 to 12:00"
        var multiSlotsMatch = Regex.Matches(message, @"\b([01]?\d|2[0-3]):00\b");
        var rangeMatch = Regex.Match(message, @"(?:from\s+)?([01]?\d|2[0-3]):00\s*(?:to|-)\s*([01]?\d|2[0-3]):00", RegexOptions.IgnoreCase);

        if (rangeMatch.Success)
        {
            int startH = int.Parse(rangeMatch.Groups[1].Value);
            int endH = int.Parse(rangeMatch.Groups[2].Value);
            if (endH > startH)
            {
                state.StartTime = $"{startH:D2}:00";
                state.HoursNeeded = Math.Clamp(endH - startH, 1, 8);
            }
        }
        else if (multiSlotsMatch.Count > 1)
        {
            var hoursList = multiSlotsMatch.Select(m => int.Parse(m.Value.Split(':')[0])).Distinct().OrderBy(h => h).ToList();
            state.StartTime = $"{hoursList.First():D2}:00";
            state.HoursNeeded = Math.Clamp(hoursList.Last() - hoursList.First() + 1, 1, 8);
        }
        else
        {
            var time12Match = Regex.Match(message, @"\b(\d{1,2})(?::00)?\s*(am|pm)\b", RegexOptions.IgnoreCase);
            if (time12Match.Success)
            {
                int hour = int.Parse(time12Match.Groups[1].Value);
                var period = time12Match.Groups[2].Value.ToLowerInvariant();
                if (period == "pm" && hour < 12) hour += 12;
                if (period == "am" && hour == 12) hour = 0;
                state.StartTime = $"{hour:D2}:00";
            }
            else
            {
                var time24Match = Regex.Match(message, @"\b([01]?\d|2[0-3]):00\b");
                if (time24Match.Success)
                {
                    int hour = int.Parse(time24Match.Groups[1].Value);
                    state.StartTime = $"{hour:D2}:00";
                }
            }

            // Duration extraction (e.g. "2 hours", "1 hr", "3 hrs")
            var durMatch = Regex.Match(message, @"\b(\d+)\s*(?:hour|hours|hr|hrs)\b", RegexOptions.IgnoreCase);
            if (durMatch.Success && int.TryParse(durMatch.Groups[1].Value, out int dur) && dur >= 1 && dur <= 8)
            {
                state.HoursNeeded = dur;
            }
        }

        // 5. Player details extraction (NIC, Phone, Name)
        var nicMatch = Regex.Match(message, @"\b(\d{9}[VvXx]|\d{12})\b");
        if (nicMatch.Success)
        {
            state.NicNumber = nicMatch.Value;
        }

        var phoneMatch = Regex.Match(message, @"\b(0\d{9}|\d{10})\b");
        if (phoneMatch.Success)
        {
            state.ContactNumber = phoneMatch.Value;
        }

        // 6. Payment method
        if (lower.Contains("bank transfer") || lower.Contains("bank slip"))
        {
            state.PaymentMethod = "BankTransfer";
        }
        else if (lower.Contains("card") || lower.Contains("visa") || lower.Contains("mastercard"))
        {
            state.PaymentMethod = "Card";
        }
    }

    private async Task ResolveFacilityAgentAsync(BookingWorkflowState state)
    {
        var facilities = await _context.Facilities.Where(f => f.IsAvailable).ToListAsync();
        var match = facilities.FirstOrDefault(f =>
            f.Name.Contains(state.Sport, StringComparison.OrdinalIgnoreCase) ||
            state.Sport.Contains(f.Name, StringComparison.OrdinalIgnoreCase));

        if (match != null)
        {
            state.FacilityId = match.Id;
            state.FacilityName = match.Name;
            state.HourlyRate = match.HourlyRate;
            state.Trajectory.Add($"Facility Agent matched '{state.Sport}' to '{match.Name}' (ID {match.Id}, LKR {match.HourlyRate:N0}/hr).");
        }
    }

    private async Task CheckAvailabilityAgentAsync(BookingWorkflowState state)
    {
        if (!state.FacilityId.HasValue || string.IsNullOrWhiteSpace(state.BookingDate)) return;

        if (!DateTime.TryParse(state.BookingDate, out var parsedDate)) return;

        var day = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);
        var facilityId = state.FacilityId.Value;

        var bookedSlots = await _context.Bookings
            .Where(b => b.FacilityId == facilityId && b.BookingDate == day && b.Status != "Cancelled")
            .Select(b => new { b.StartTime, b.EndTime })
            .ToListAsync();

        var schedules = await _context.FacilitySchedules
            .Where(s => s.FacilityId == facilityId && s.DayOfWeek == day.DayOfWeek)
            .ToListAsync();

        var slNow = CancellationRefundService.GetCurrentLocalTime();
        var today = slNow.Date;
        var nowTime = slNow.TimeOfDay;

        var freeSlots = new List<string>();
        for (int h = 8; h <= 23; h++)
        {
            var start = TimeSpan.FromHours(h);
            var end = start.Add(TimeSpan.FromHours(1));
            bool isPast = day.Date < today || (day.Date == today && start <= nowTime);
            bool isBooked = bookedSlots.Any(b => b.StartTime < end && b.EndTime > start);
            bool isWithinSchedule = schedules.Count == 0 || schedules.Any(s => s.StartTime <= start && s.EndTime >= end);

            if (!isPast && !isBooked && isWithinSchedule)
            {
                freeSlots.Add($"{h:D2}:00");
            }
        }

        state.AvailableSlots = freeSlots;
        state.Trajectory.Add($"Availability Agent found {freeSlots.Count} free slots on {state.BookingDate} for {state.FacilityName}.");

        // Validate selected start time and all consecutive hours if user specified one
        if (!string.IsNullOrWhiteSpace(state.StartTime))
        {
            var startSpan = TimeSpan.Parse(state.StartTime);
            bool allConsecutiveAvailable = true;
            for (int i = 0; i < state.HoursNeeded; i++)
            {
                var slotCheck = startSpan.Add(TimeSpan.FromHours(i)).ToString(@"hh\:mm");
                if (!freeSlots.Contains(slotCheck))
                {
                    allConsecutiveAvailable = false;
                    break;
                }
            }

            if (!allConsecutiveAvailable)
            {
                state.Trajectory.Add($"Availability Agent: Requested slot {state.StartTime} for {state.HoursNeeded} linear hr(s) is not fully available.");
                state.StartTime = null; // Clear conflicting slot
            }
            else
            {
                // Validate duration
                var endSpan = startSpan.Add(TimeSpan.FromHours(state.HoursNeeded));
                if (endSpan > TimeSpan.FromHours(24))
                {
                    state.HoursNeeded = (int)(TimeSpan.FromHours(24) - startSpan).TotalHours;
                    endSpan = startSpan.Add(TimeSpan.FromHours(state.HoursNeeded));
                }
                state.EndTime = endSpan.ToString(@"hh\:mm");
                state.TotalAmount = (state.HourlyRate ?? 1000m) * state.HoursNeeded;
            }
        }
    }

    private static void EvaluateStepProgress(BookingWorkflowState state)
    {
        state.MissingFields.Clear();

        if (string.IsNullOrWhiteSpace(state.FacilityName)) state.MissingFields.Add("Sport / Venue");
        if (string.IsNullOrWhiteSpace(state.BookingDate)) state.MissingFields.Add("Match Date");
        if (string.IsNullOrWhiteSpace(state.StartTime)) state.MissingFields.Add("Start Time");

        if (state.MissingFields.Count > 0)
        {
            state.CurrentStep = 1;
            state.Status = "collecting_requirements";
            state.AwaitingConfirmation = false;
            return;
        }

        // Check Step 2 Player Details
        if (string.IsNullOrWhiteSpace(state.CustomerName)) state.MissingFields.Add("Customer Name");
        if (string.IsNullOrWhiteSpace(state.NicNumber) || !Regex.IsMatch(state.NicNumber.Trim(), @"^(\d{9}[VvXx]|\d{12})$"))
            state.MissingFields.Add("Valid NIC Number");
        if (string.IsNullOrWhiteSpace(state.ContactNumber) || !Regex.IsMatch(state.ContactNumber.Trim(), @"^\d{10}$"))
            state.MissingFields.Add("10-digit Contact Number");

        if (state.MissingFields.Count > 0)
        {
            state.CurrentStep = 2;
            state.Status = "collecting_requirements";
            state.AwaitingConfirmation = false;
            return;
        }

        // All Step 1 & 2 details valid -> Ready for Step 3: Payment & Confirmation
        state.CurrentStep = 3;
        state.Status = "awaiting_confirmation";
        state.AwaitingConfirmation = true;
    }

    private static BookingWorkflowResponse BuildWorkflowResponse(BookingWorkflowState state)
    {
        string message;
        var suggestedOptions = new List<string>();

        if (state.CurrentStep == 1)
        {
            if (string.IsNullOrWhiteSpace(state.FacilityName))
            {
                message = "Which sport or court facility would you like to book?";
                suggestedOptions.AddRange(new[] { "Badminton Court", "Football Field", "Cricket Ground", "Basketball Arena", "Swimming Pool", "Table Tennis" });
            }
            else if (string.IsNullOrWhiteSpace(state.BookingDate))
            {
                message = $"Great choice! {state.FacilityName} costs LKR {state.HourlyRate:N0}/hour. Which date would you like to play?";
                suggestedOptions.AddRange(new[] { "Today", "Tomorrow", "Pick a date" });
            }
            else if (string.IsNullOrWhiteSpace(state.StartTime))
            {
                if (state.AvailableSlots.Count > 0)
                {
                    message = $"{state.FacilityName} on {state.BookingDate} has available slots at: {string.Join(", ", state.AvailableSlots.Take(6))}. Which time works best for you?";
                    suggestedOptions.AddRange(state.AvailableSlots.Take(4));
                }
                else
                {
                    message = $"Sorry, {state.FacilityName} is fully booked on {state.BookingDate}. Please choose another date.";
                    suggestedOptions.AddRange(new[] { "Tomorrow", "Pick another date" });
                }
            }
            else
            {
                message = $"Got it! {state.FacilityName} on {state.BookingDate} at {state.StartTime} for {state.HoursNeeded} hr(s).";
            }
        }
        else if (state.CurrentStep == 2)
        {
            message = $"We need your player contact details to issue your pass. Missing: {string.Join(", ", state.MissingFields)}.";
        }
        else if (state.CurrentStep == 3)
        {
            message = $"All details verified! Please review your booking summary below and click 'Confirm & Book' to finalize.";
            suggestedOptions.Add("Confirm Booking");
        }
        else
        {
            message = "Booking completed.";
        }

        BookingSummaryDto? summary = null;
        if (state.FacilityId.HasValue && !string.IsNullOrWhiteSpace(state.BookingDate) && !string.IsNullOrWhiteSpace(state.StartTime))
        {
            summary = new BookingSummaryDto
            {
                Sport = state.Sport,
                FacilityName = state.FacilityName ?? "Facility",
                FacilityId = state.FacilityId.Value,
                BookingDate = state.BookingDate,
                StartTime = state.StartTime,
                EndTime = state.EndTime ?? string.Empty,
                HoursNeeded = state.HoursNeeded,
                HourlyRate = state.HourlyRate ?? 0,
                TotalAmount = (state.HourlyRate ?? 0) * state.HoursNeeded,
                CustomerName = state.CustomerName,
                NicNumber = state.NicNumber,
                ContactNumber = state.ContactNumber,
                PaymentMethod = state.PaymentMethod
            };
        }

        return new BookingWorkflowResponse
        {
            WorkflowId = state.WorkflowId,
            Status = state.Status,
            CurrentStep = state.CurrentStep,
            Message = message,
            Summary = summary,
            SuggestedOptions = suggestedOptions,
            AvailableSlots = state.AvailableSlots,
            MissingFields = state.MissingFields,
            Trajectory = state.Trajectory,
            BookingId = state.ConfirmedBookingId
        };
    }

    private static BookingWorkflowState DeserializeState(string json, Guid workflowId, int userId)
    {
        try
        {
            var state = JsonSerializer.Deserialize<BookingWorkflowState>(json);
            if (state != null)
            {
                state.WorkflowId = workflowId;
                state.CustomerId = userId;
                return state;
            }
        }
        catch {}

        return new BookingWorkflowState
        {
            WorkflowId = workflowId,
            CustomerId = userId
        };
    }

    private static async Task<byte[]> ReadFileSignatureAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        var signature = new byte[Math.Min(8, file.Length)];
        var read = await stream.ReadAsync(signature.AsMemory(0, signature.Length));
        return signature[..read];
    }

    private static string? DetectFileExtension(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytes.Length >= 8 && bytes.Take(8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return ".png";
        }

        if (bytes.Length >= 4 && bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46)
        {
            return ".pdf";
        }

        return null;
    }
}
