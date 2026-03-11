namespace BackEnd.Shared.Models.Common;

public class ApiResponse<T>
{
    public T Data { get; set; } = default!;

    public ApiResponse() { }

    public ApiResponse(T data)
    {
        Data = data;
    }
}
