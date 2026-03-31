using System.Text.Json.Serialization;

namespace BackEnd.Shared.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum QuoteStatus
{
    Draft,
    Sent,
    Accepted,
    Refused
}
