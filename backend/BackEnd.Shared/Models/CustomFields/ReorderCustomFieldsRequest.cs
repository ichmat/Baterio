using System.ComponentModel.DataAnnotations;

namespace BackEnd.Shared.Models.CustomFields;

public class ReorderCustomFieldsRequest
{
    [Required]
    public string Context { get; set; } = null!;

    [Required]
    public List<int> FieldIds { get; set; } = new();
}
