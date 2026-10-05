using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SmartSports.Api.Migrations;

public partial class NormalizeSportCategoriesAndFacilityEquipment : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SportCategories",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false).Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Name = table.Column<string>(type: "text", nullable: false),
                NormalizedName = table.Column<string>(type: "text", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_SportCategories", x => x.Id));
        migrationBuilder.CreateIndex("IX_SportCategories_NormalizedName", "SportCategories", "NormalizedName", unique: true);
        migrationBuilder.Sql("""INSERT INTO "SportCategories" ("Name", "NormalizedName") VALUES ('Other', 'OTHER');""");
        migrationBuilder.Sql("""INSERT INTO "SportCategories" ("Name", "NormalizedName") SELECT DISTINCT trim("SportCategory"), upper(trim("SportCategory")) FROM "Facilities" WHERE trim("SportCategory") <> '' ON CONFLICT ("NormalizedName") DO NOTHING;""");
        migrationBuilder.Sql("""INSERT INTO "SportCategories" ("Name", "NormalizedName") SELECT DISTINCT trim("SportCategory"), upper(trim("SportCategory")) FROM "Equipments" WHERE trim("SportCategory") <> '' ON CONFLICT ("NormalizedName") DO NOTHING;""");
        migrationBuilder.AddColumn<int>("SportCategoryId", "Facilities", nullable: false, defaultValue: 1);
        migrationBuilder.AddColumn<int>("SportCategoryId", "Equipments", nullable: false, defaultValue: 1);
        migrationBuilder.Sql("""UPDATE "Facilities" f SET "SportCategoryId" = c."Id" FROM "SportCategories" c WHERE c."NormalizedName" = upper(trim(f."SportCategory"));""");
        migrationBuilder.Sql("""UPDATE "Equipments" e SET "SportCategoryId" = c."Id" FROM "SportCategories" c WHERE c."NormalizedName" = upper(trim(e."SportCategory"));""");
        migrationBuilder.CreateIndex("IX_Facilities_SportCategoryId", "Facilities", "SportCategoryId");
        migrationBuilder.CreateIndex("IX_Equipments_SportCategoryId", "Equipments", "SportCategoryId");
        migrationBuilder.AddForeignKey("FK_Facilities_SportCategories_SportCategoryId", "Facilities", "SportCategoryId", "SportCategories", "Id", onDelete: ReferentialAction.Restrict);
        migrationBuilder.AddForeignKey("FK_Equipments_SportCategories_SportCategoryId", "Equipments", "SportCategoryId", "SportCategories", "Id", onDelete: ReferentialAction.Restrict);
        migrationBuilder.CreateTable(
            name: "FacilityEquipments",
            columns: table => new { FacilityId = table.Column<int>(nullable: false), EquipmentId = table.Column<int>(nullable: false) },
            constraints: table =>
            {
                table.PrimaryKey("PK_FacilityEquipments", x => new { x.FacilityId, x.EquipmentId });
                table.ForeignKey("FK_FacilityEquipments_Facilities_FacilityId", x => x.FacilityId, "Facilities", "Id", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_FacilityEquipments_Equipments_EquipmentId", x => x.EquipmentId, "Equipments", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.Sql("""INSERT INTO "FacilityEquipments" ("FacilityId", "EquipmentId") SELECT "FacilityId", "Id" FROM "Equipments" WHERE "FacilityId" IS NOT NULL;""");
        migrationBuilder.DropForeignKey("FK_Equipments_Facilities_FacilityId", "Equipments");
        migrationBuilder.DropIndex("IX_Equipments_FacilityId", "Equipments");
        migrationBuilder.DropColumn("FacilityId", "Equipments");
    }

    protected override void Down(MigrationBuilder migrationBuilder) { }
}
