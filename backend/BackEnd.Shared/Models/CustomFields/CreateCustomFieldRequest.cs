using System.ComponentModel.DataAnnotations;

namespace BackEnd.Shared.Models.CustomFields;

public class CreateCustomFieldRequest
{
    [Required]
    [MaxLength(255)]
    public string Label { get; set; } = null!;

    [Required]
    public string FieldType { get; set; } = null!;

    public string? Options { get; set; }

    [Required]
    public string ObligationLevel { get; set; } = null!;

    public bool AppliesToQuotes { get; set; } = true;
    public bool AppliesToSites { get; set; } = true;
}
