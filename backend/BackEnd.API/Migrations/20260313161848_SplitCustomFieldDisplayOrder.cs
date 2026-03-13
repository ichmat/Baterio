using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BackEnd.API.Migrations
{
    /// <inheritdoc />
    public partial class SplitCustomFieldDisplayOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add new columns first
            migrationBuilder.AddColumn<int>(
                name: "display_order_quotes",
                table: "custom_field_definitions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "display_order_sites",
                table: "custom_field_definitions",
                type: "int",
                nullable: true);

            // Migrate existing data: copy display_order to appropriate new columns
            migrationBuilder.Sql(
                "UPDATE custom_field_definitions SET display_order_quotes = display_order WHERE applies_to_quotes = 1");
            migrationBuilder.Sql(
                "UPDATE custom_field_definitions SET display_order_sites = display_order WHERE applies_to_sites = 1");

            // Create new indexes BEFORE dropping old one (MySQL needs an index covering the FK on tenant_id)
            migrationBuilder.CreateIndex(
                name: "IX_custom_field_definitions_tenant_id_display_order_quotes",
                table: "custom_field_definitions",
                columns: new[] { "tenant_id", "display_order_quotes" });

            migrationBuilder.CreateIndex(
                name: "IX_custom_field_definitions_tenant_id_display_order_sites",
                table: "custom_field_definitions",
                columns: new[] { "tenant_id", "display_order_sites" });

            // Now safe to drop old index and column
            migrationBuilder.DropIndex(
                name: "IX_custom_field_definitions_tenant_id_display_order",
                table: "custom_field_definitions");

            migrationBuilder.DropColumn(
                name: "display_order",
                table: "custom_field_definitions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_custom_field_definitions_tenant_id_display_order_quotes",
                table: "custom_field_definitions");

            migrationBuilder.DropIndex(
                name: "IX_custom_field_definitions_tenant_id_display_order_sites",
                table: "custom_field_definitions");

            migrationBuilder.DropColumn(
                name: "display_order_quotes",
                table: "custom_field_definitions");

            migrationBuilder.DropColumn(
                name: "display_order_sites",
                table: "custom_field_definitions");

            migrationBuilder.AddColumn<int>(
                name: "display_order",
                table: "custom_field_definitions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_custom_field_definitions_tenant_id_display_order",
                table: "custom_field_definitions",
                columns: new[] { "tenant_id", "display_order" });
        }
    }
}
