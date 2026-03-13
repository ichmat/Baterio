using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Entities;

public class CustomFieldDefinition
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string Label { get; set; } = null!;
    public FieldType FieldType { get; set; }
    public string? Options { get; set; }
    public ObligationLevel ObligationLevel { get; set; }
    public bool AppliesToQuotes { get; set; }
    public bool AppliesToSites { get; set; }
    public int? DisplayOrderQuotes { get; set; }
    public int? DisplayOrderSites { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
