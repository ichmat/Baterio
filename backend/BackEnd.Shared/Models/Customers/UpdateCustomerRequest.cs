namespace BackEnd.Shared.Models.Customers;

public class UpdateCustomerRequest
{
    public string LastName { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string? Telephone { get; set; }

    public string? Email { get; set; }

    public string? Address { get; set; }
}
