using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Models.CustomFields;

public class CustomFieldResponse
{
    public int Id { get; set; }
    public string Label { get; set; } = null!;
    public FieldType FieldType { get; set; }
    public string? Options { get; set; }
    public ObligationLevel ObligationLevel { get; set; }
    public bool AppliesToQuotes { get; set; }
    public bool AppliesToSites { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
