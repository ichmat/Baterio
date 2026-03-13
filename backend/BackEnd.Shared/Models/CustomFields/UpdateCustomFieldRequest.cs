namespace BackEnd.Shared.Models.CustomFields;

public class UpdateCustomFieldRequest
{
    public string? Label { get; set; }
    public string? FieldType { get; set; }
    public string? Options { get; set; }
    public string? ObligationLevel { get; set; }
    public bool? AppliesToQuotes { get; set; }
    public bool? AppliesToSites { get; set; }
}
