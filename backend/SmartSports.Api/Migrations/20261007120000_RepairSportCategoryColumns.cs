using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using SmartSportsFacilityBooking.Data;

#nullable disable

namespace SmartSports.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261007120000_RepairSportCategoryColumns")]
public partial class RepairSportCategoryColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Facilities"
            ADD COLUMN IF NOT EXISTS "SportCategory" text NOT NULL DEFAULT 'Other';
            """);
        migrationBuilder.Sql("""
            ALTER TABLE "Equipments"
            ADD COLUMN IF NOT EXISTS "SportCategory" text NOT NULL DEFAULT 'Other';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
