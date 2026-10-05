using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartSportsFacilityBooking.Data;

#nullable disable

namespace SmartSports.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261007130000_BackfillFacilitySportCategories")]
public partial class BackfillFacilitySportCategories : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE "Facilities" f
            SET "SportCategory" = categories."Name",
                "SportCategoryId" = categories."Id"
            FROM "SportCategories" categories
            WHERE f."SportCategory" = 'Other'
              AND categories."NormalizedName" = CASE
                  WHEN lower(f."Name") LIKE '%badminton%' THEN 'BADMINTON'
                  WHEN lower(f."Name") LIKE '%cricket%' THEN 'CRICKET'
                  WHEN lower(f."Name") LIKE '%football%' OR lower(f."Name") LIKE '%soccer%' THEN 'FOOTBALL'
                  WHEN lower(f."Name") LIKE '%basketball%' THEN 'BASKETBALL'
                  WHEN lower(f."Name") LIKE '%swimming%' OR lower(f."Name") LIKE '%pool%' THEN 'SWIMMING'
                  WHEN lower(f."Name") LIKE '%table tennis%' THEN 'TABLE TENNIS'
                  WHEN lower(f."Name") LIKE '%volleyball%' THEN 'VOLLEYBALL'
                  ELSE 'OTHER'
              END;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
