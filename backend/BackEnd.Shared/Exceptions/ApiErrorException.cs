using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Exceptions;

public class ApiErrorException : Exception
{
    public ApiError Code { get; }

    public ApiErrorException(ApiError code) : base(code.ToString())
    {
        Code = code;
    }

    public ApiErrorException(ApiError code, string message) : base(message)
    {
        Code = code;
    }
}
