using System.Diagnostics;
using System.Text.Json;
using SmartSportsFacilityBooking.AI.Contracts;

namespace SmartSportsFacilityBooking.AI.Agents;

public class PlanningCoordinationAgent : IAgent
{
    public string Name => "Planning Coordinator";
    public string Role => AgentRoles.Coordinator;
    public string Responsibility => "Analyzes domain objective, constructs multi-step execution graph, and delegates sub-tasks to specialized domain agents.";
    public IReadOnlyList<string> AllowedTools => Array.Empty<string>();

    public Task<AgentResult> ExecuteStepAsync(AgentExecutionContext context)
    {
        var sw = Stopwatch.StartNew();

        var plan = new StructuredWorkflowPlan
        {
            Objective = context.Objective,
            Strategy = $"Domain goal decomposition for {context.FacilityType} booking: Execute catalog analysis, hard-rule validation, and stage proposal under human-in-the-loop oversight.",
            Steps = new List<PlannedStep>
            {
                new()
                {
                    StepIndex = 1,
                    AgentRole = AgentRoles.FacilityAnalyst,
                    StepName = "Facility & Requirements Analysis",
                    Description = "Search available facilities matching sport type and verify court specifications and pricing.",
                    ExpectedTools = new() { "search_facilities", "get_facility_details" },
                    DependsOnSteps = new()
                },
                new()
                {
                    StepIndex = 2,
                    AgentRole = AgentRoles.ValidationEngine,
                    StepName = "Deterministic Validation & Collision Check",
                    Description = "Verify schedule conflict status, budget sufficiency, capacity thresholds, and facility operating hours.",
                    ExpectedTools = new() { "check_schedule_conflict", "validate_business_rules" },
                    DependsOnSteps = new() { 1 }
                },
                new()
                {
                    StepIndex = 3,
                    AgentRole = AgentRoles.ActionExecutor,
                    StepName = "Proposal Staging & Human Approval Gate",
                    Description = "Synthesize validated quotation, stage the proposal without DB mutations, and pause for authorized manager approval.",
                    ExpectedTools = new() { "stage_booking_proposal" },
                    DependsOnSteps = new() { 2 }
                }
            }
        };

        context.SetMemory("WorkflowPlan", plan);
        sw.Stop();

        return Task.FromResult(AgentResult.Succeeded(
            $"Structured workflow plan generated with {plan.Steps.Count} delegated agent steps.",
            plan,
            durationMs: sw.ElapsedMilliseconds
        ));
    }
}
