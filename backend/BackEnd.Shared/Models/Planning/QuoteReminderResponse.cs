namespace BackEnd.Shared.Models.Planning;

public class QuoteReminderResponse
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string ReminderDate { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}
