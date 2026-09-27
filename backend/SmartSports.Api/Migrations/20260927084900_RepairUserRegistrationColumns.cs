using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSports.Api.Migrations
{
    /// <inheritdoc />
    public partial class RepairUserRegistrationColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"ContactNumber\" text NOT NULL DEFAULT '';");
            migrationBuilder.Sql("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"NicNumber\" text NOT NULL DEFAULT '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"Users\" DROP COLUMN IF EXISTS \"ContactNumber\";");
            migrationBuilder.Sql("ALTER TABLE \"Users\" DROP COLUMN IF EXISTS \"NicNumber\";");
        }
    }
}
