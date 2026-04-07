namespace BackEnd.Shared.Entities;

public class CompanyInfo
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string? CompanyName { get; set; }
    public string? Address { get; set; }
    public string? Siret { get; set; }
    public string? VatNumber { get; set; }
    public string? LegalForm { get; set; }
    public string? InsurancePolicyNumber { get; set; }
    public string? InsuranceProvider { get; set; }
    public string? InsuranceCoverage { get; set; }
    public string? DefaultPaymentTerms { get; set; }
    public string? AssignmentPresets { get; set; }  // JSON
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
