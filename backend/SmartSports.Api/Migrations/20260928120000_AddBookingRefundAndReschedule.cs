using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSports.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingRefundAndReschedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""RefundAmount"" numeric;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""RefundPercentage"" integer;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""RefundStatus"" text;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""CancelledAt"" timestamp with time zone;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""IsRescheduleRequested"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""RescheduleReason"" text;
                ALTER TABLE ""Bookings"" ADD COLUMN IF NOT EXISTS ""RescheduleRequestedAt"" timestamp with time zone;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefundAmount",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundPercentage",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RefundStatus",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "IsRescheduleRequested",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RescheduleReason",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RescheduleRequestedAt",
                table: "Bookings");
        }
    }
}
