using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSportsFacilityBooking.Migrations;

public partial class AddFacilitySportCategory : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "SportCategory",
            table: "Facilities",
            type: "text",
            nullable: false,
            defaultValue: "Other");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "SportCategory",
            table: "Facilities");
    }
}
