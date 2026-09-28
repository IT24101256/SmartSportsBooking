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
            migrationBuilder.AddColumn<decimal>(
                name: "RefundAmount",
                table: "Bookings",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RefundPercentage",
                table: "Bookings",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RefundStatus",
                table: "Bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRescheduleRequested",
                table: "Bookings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RescheduleReason",
                table: "Bookings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RescheduleRequestedAt",
                table: "Bookings",
                type: "timestamp with time zone",
                nullable: true);
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
