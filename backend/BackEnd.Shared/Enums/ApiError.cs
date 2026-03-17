namespace BackEnd.Shared.Enums;

public enum ApiError
{
    [ApiErrorInfo(401, "Email ou mot de passe incorrect")]
    InvalidCredentials,

    [ApiErrorInfo(404, "Utilisateur non trouvé")]
    UserNotFound,

    [ApiErrorInfo(403, "Votre compte a été désactivé")]
    UserInactive,

    [ApiErrorInfo(401, "Token de rafraîchissement invalide")]
    InvalidRefreshToken,

    [ApiErrorInfo(401, "Token de rafraîchissement expiré")]
    ExpiredRefreshToken,

    [ApiErrorInfo(401, "Non autorisé")]
    Unauthorized,

    [ApiErrorInfo(403, "Accès interdit")]
    Forbidden,

    [ApiErrorInfo(409, "Un utilisateur avec cet email existe déjà")]
    EmailAlreadyExists,

    [ApiErrorInfo(403, "Vous avez atteint la limite de {0} utilisateurs de votre abonnement")]
    UserLimitReached,

    [ApiErrorInfo(400, "Vous ne pouvez pas désactiver votre propre compte")]
    CannotDeactivateSelf,

    [ApiErrorInfo(400, "Rôle invalide")]
    InvalidRole,

    [ApiErrorInfo(400, "Vous ne pouvez pas modifier votre propre rôle")]
    CannotChangeOwnRole,

    [ApiErrorInfo(404, "Champ personnalisé non trouvé")]
    CustomFieldNotFound,

    [ApiErrorInfo(400, "Label invalide")]
    InvalidLabel,

    [ApiErrorInfo(400, "Type de champ invalide")]
    InvalidFieldType,

    [ApiErrorInfo(400, "Niveau d'obligation invalide")]
    InvalidObligationLevel,

    [ApiErrorInfo(400, "Le champ doit s'appliquer aux devis et/ou aux chantiers")]
    AppliesToRequired,

    [ApiErrorInfo(400, "Le type de champ ne peut pas être modifié après création")]
    FieldTypeNotModifiable,

    [ApiErrorInfo(400, "La liste de réordonnancement est invalide")]
    InvalidReorderList,

    [ApiErrorInfo(400, "Le contexte de réordonnancement doit être 'quotes' ou 'sites'")]
    InvalidReorderContext,

    // Audit
    [ApiErrorInfo(400, "Le type d'entité est requis")]
    AuditEntityTypeRequired,

    [ApiErrorInfo(400, "L'identifiant d'entité est requis")]
    AuditEntityIdRequired,

    // Files
    [ApiErrorInfo(404, "Fichier introuvable")]
    FileNotFound,

    [ApiErrorInfo(400, "Le fichier dépasse la taille maximale de 10 Mo")]
    FileTooLarge,

    [ApiErrorInfo(400, "Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF, Word, Excel")]
    FileTypeNotAllowed,

    [ApiErrorInfo(400, "Aucun fichier fourni")]
    FileRequired,

    [ApiErrorInfo(400, "Le type d'entité est requis")]
    FileEntityTypeRequired,

    [ApiErrorInfo(400, "L'identifiant d'entité est requis")]
    FileEntityIdRequired,

    [ApiErrorInfo(400, "Le type d'entité dépasse 100 caractères")]
    FileEntityTypeTooLong,

    [ApiErrorInfo(400, "Le nom du fichier dépasse 255 caractères")]
    FileNameTooLong
}
