namespace BackEnd.Shared.Enums;

[AttributeUsage(AttributeTargets.Field)]
public class ApiErrorInfoAttribute : Attribute
{
    public int Status { get; }
    public string Message { get; }

    public ApiErrorInfoAttribute(int status, string message)
    {
        Status = status;
        Message = message;
    }
}
