using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartSports.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFacilityDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "HourlyRate",
                table: "Facilities",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Facilities",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Faq",
                table: "Facilities",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "Images",
                table: "Facilities",
                type: "text",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.DropColumn(name: "Type", table: "Facilities");
            migrationBuilder.DropColumn(name: "Location", table: "Facilities");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "Type", table: "Facilities", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Location", table: "Facilities", type: "text", nullable: false, defaultValue: "");
            migrationBuilder.DropColumn(name: "HourlyRate", table: "Facilities");
            migrationBuilder.DropColumn(name: "Description", table: "Facilities");
            migrationBuilder.DropColumn(name: "Faq", table: "Facilities");
            migrationBuilder.DropColumn(name: "Images", table: "Facilities");
        }
    }
}
