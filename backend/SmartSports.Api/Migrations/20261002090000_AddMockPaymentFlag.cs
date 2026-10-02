using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SmartSportsFacilityBooking.Data;

#nullable disable

namespace SmartSports.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261002090000_AddMockPaymentFlag")]
public partial class AddMockPaymentFlag : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsMockPayment",
            table: "Bookings",
            type: "boolean",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsMockPayment",
            table: "Bookings");
    }
}
