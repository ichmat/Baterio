namespace BackEnd.Shared.Models.Company;

public class CompanyInfoResponse
{
    public int Id { get; set; }
    public string? CompanyName { get; set; }
    public string? Address { get; set; }
    public string? Siret { get; set; }
    public string? VatNumber { get; set; }
    public string? LegalForm { get; set; }
    public string? InsurancePolicyNumber { get; set; }
    public string? InsuranceProvider { get; set; }
    public string? InsuranceCoverage { get; set; }
    public string? DefaultPaymentTerms { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
