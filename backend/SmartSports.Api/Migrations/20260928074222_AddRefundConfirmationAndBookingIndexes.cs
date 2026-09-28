using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSports.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundConfirmationAndBookingIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings");

            migrationBuilder.AddColumn<DateTime>(
                name: "RefundConfirmedAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundConfirmedBy",
                table: "Bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundNotes",
                table: "Bookings",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_BookingDate",
                table: "Bookings",
                column: "BookingDate");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_FacilityId_BookingDate",
                table: "Bookings",
                columns: new[] { "FacilityId", "BookingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_IsRescheduleRequested",
                table: "Bookings",
                column: "IsRescheduleRequested");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_RefundStatus",
                table: "Bookings",
                column: "RefundStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_RefundStatus_BookingDate",
                table: "Bookings",
                columns: new[] { "RefundStatus", "BookingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_Status",
                table: "Bookings",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_Status_BookingDate",
                table: "Bookings",
                columns: new[] { "Status", "BookingDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId_BookingDate",
                table: "Bookings",
                columns: new[] { "UserId", "BookingDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_BookingDate",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_FacilityId_BookingDate",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_IsRescheduleRequested",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_RefundStatus",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_RefundStatus_BookingDate",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_Status",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_Status_BookingDate",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId_BookingDate",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundConfirmedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundConfirmedBy",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundNotes",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings",
                column: "UserId");
        }
    }
}
