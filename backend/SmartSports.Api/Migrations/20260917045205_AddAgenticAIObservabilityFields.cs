using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSports.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAgenticAIObservabilityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ExecutionDurationMs",
                table: "BookingWorkflowSteps",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "ToolsCalledJson",
                table: "BookingWorkflowSteps",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DecisionBy",
                table: "BookingWorkflows",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ExecutionDurationMs",
                table: "BookingWorkflows",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<int>(
                name: "RevisionCount",
                table: "BookingWorkflows",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExecutionDurationMs",
                table: "BookingWorkflowSteps");

            migrationBuilder.DropColumn(
                name: "ToolsCalledJson",
                table: "BookingWorkflowSteps");

            migrationBuilder.DropColumn(
                name: "DecisionBy",
                table: "BookingWorkflows");

            migrationBuilder.DropColumn(
                name: "ExecutionDurationMs",
                table: "BookingWorkflows");

            migrationBuilder.DropColumn(
                name: "RevisionCount",
                table: "BookingWorkflows");
        }
    }
}
