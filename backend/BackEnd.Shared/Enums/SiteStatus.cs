using System.Text.Json.Serialization;

namespace BackEnd.Shared.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SiteStatus
{
    Planned,
    InProgress,
    Paused,
    Completed
}
