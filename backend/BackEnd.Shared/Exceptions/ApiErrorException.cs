using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Exceptions;

public class ApiErrorException : Exception
{
    public ApiError Code { get; }

    public object[] Formats { get; }

    public ApiErrorException(ApiError code) : base(code.ToString())
    {
        Code = code;
        Formats = [];
    }

    public ApiErrorException(ApiError code, params object[] formats) : base(code.ToString())
    {
        Code = code;
        Formats = formats;
    }
}
