namespace BackEnd.Shared.Enums;

public enum ApiError
{
    /// <summary>
    /// Email ou mot de passe incorrect
    /// </summary>
    [ApiErrorInfo(401, "Email ou mot de passe incorrect")]
    InvalidCredentials,

    /// <summary>
    /// Utilisateur non trouvé
    /// </summary>
    [ApiErrorInfo(404, "Utilisateur non trouvé")]
    UserNotFound,

    /// <summary>
    /// Votre compte a été désactivé
    /// </summary>
    [ApiErrorInfo(403, "Votre compte a été désactivé")]
    UserInactive,

    /// <summary>
    /// Token de rafraîchissement invalide
    /// </summary>
    [ApiErrorInfo(401, "Token de rafraîchissement invalide")]
    InvalidRefreshToken,

    /// <summary>
    /// Token de rafraîchissement expiré
    /// </summary>
    [ApiErrorInfo(401, "Token de rafraîchissement expiré")]
    ExpiredRefreshToken,

    /// <summary>
    /// Non autorisé
    /// </summary>
    [ApiErrorInfo(401, "Non autorisé")]
    Unauthorized,

    /// <summary>
    /// Accès interdit
    /// </summary>
    [ApiErrorInfo(403, "Accès interdit")]
    Forbidden,

    /// <summary>
    /// Un utilisateur avec cet email existe déjà
    /// </summary>
    [ApiErrorInfo(409, "Un utilisateur avec cet email existe déjà")]
    EmailAlreadyExists,

    /// <summary>
    /// Vous avez atteint la limite de {0} utilisateurs de votre abonnement
    /// </summary>
    [ApiErrorInfo(403, "Vous avez atteint la limite de {0} utilisateurs de votre abonnement")]
    UserLimitReached,

    /// <summary>
    /// Vous ne pouvez pas désactiver votre propre compte
    /// </summary>
    [ApiErrorInfo(400, "Vous ne pouvez pas désactiver votre propre compte")]
    CannotDeactivateSelf,

    /// <summary>
    /// Rôle invalide
    /// </summary>
    [ApiErrorInfo(400, "Rôle invalide")]
    InvalidRole,

    /// <summary>
    /// Vous ne pouvez pas modifier votre propre rôle
    /// </summary>
    [ApiErrorInfo(400, "Vous ne pouvez pas modifier votre propre rôle")]
    CannotChangeOwnRole,

    /// <summary>
    /// Champ personnalisé non trouvé
    /// </summary>
    [ApiErrorInfo(404, "Champ personnalisé non trouvé")]
    CustomFieldNotFound,

    /// <summary>
    /// Label invalide
    /// </summary>
    [ApiErrorInfo(400, "Label invalide")]
    InvalidLabel,

    /// <summary>
    /// Le libellé ne peut pas contenir le caractère ':'
    /// </summary>
    [ApiErrorInfo(400, "Le libellé ne peut pas contenir le caractère ':'")]
    InvalidLabelCharacter,

    /// <summary>
    /// Type de champ invalide
    /// </summary>
    [ApiErrorInfo(400, "Type de champ invalide")]
    InvalidFieldType,

    /// <summary>
    /// Niveau d'obligation invalide
    /// </summary>
    [ApiErrorInfo(400, "Niveau d'obligation invalide")]
    InvalidObligationLevel,

    /// <summary>
    /// Le champ doit s'appliquer aux devis et/ou aux chantiers
    /// </summary>
    [ApiErrorInfo(400, "Le champ doit s'appliquer aux devis et/ou aux chantiers")]
    AppliesToRequired,

    /// <summary>
    /// Le type de champ ne peut pas être modifié après création
    /// </summary>
    [ApiErrorInfo(400, "Le type de champ ne peut pas être modifié après création")]
    FieldTypeNotModifiable,

    /// <summary>
    /// La liste de réordonnancement est invalide
    /// </summary>
    [ApiErrorInfo(400, "La liste de réordonnancement est invalide")]
    InvalidReorderList,

    /// <summary>
    /// Le contexte de réordonnancement doit être 'quotes' ou 'sites'
    /// </summary>
    [ApiErrorInfo(400, "Le contexte de réordonnancement doit être 'quotes' ou 'sites'")]
    InvalidReorderContext,

    // Audit

    /// <summary>
    /// Le type d'entité est requis
    /// </summary>
    [ApiErrorInfo(400, "Le type d'entité est requis")]
    AuditEntityTypeRequired,

    /// <summary>
    /// L'identifiant d'entité est requis
    /// </summary>
    [ApiErrorInfo(400, "L'identifiant d'entité est requis")]
    AuditEntityIdRequired,

    // Files

    /// <summary>
    /// Fichier introuvable
    /// </summary>
    [ApiErrorInfo(404, "Fichier introuvable")]
    FileNotFound,

    /// <summary>
    /// Le fichier dépasse la taille maximale de 10 Mo
    /// </summary>
    [ApiErrorInfo(400, "Le fichier dépasse la taille maximale de 10 Mo")]
    FileTooLarge,

    /// <summary>
    /// Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF, Word, Excel
    /// </summary>
    [ApiErrorInfo(400, "Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF, Word, Excel")]
    FileTypeNotAllowed,

    /// <summary>
    /// Aucun fichier fourni
    /// </summary>
    [ApiErrorInfo(400, "Aucun fichier fourni")]
    FileRequired,

    /// <summary>
    /// Le type d'entité est requis
    /// </summary>
    [ApiErrorInfo(400, "Le type d'entité est requis")]
    FileEntityTypeRequired,

    /// <summary>
    /// L'identifiant d'entité est requis
    /// </summary>
    [ApiErrorInfo(400, "L'identifiant d'entité est requis")]
    FileEntityIdRequired,

    /// <summary>
    /// Le type d'entité dépasse 100 caractères
    /// </summary>
    [ApiErrorInfo(400, "Le type d'entité dépasse 100 caractères")]
    FileEntityTypeTooLong,

    /// <summary>
    /// Le nom du fichier dépasse 255 caractères
    /// </summary>
    [ApiErrorInfo(400, "Le nom du fichier dépasse 255 caractères")]
    FileNameTooLong,

    // Customers

    /// <summary>
    /// Client introuvable
    /// </summary>
    [ApiErrorInfo(404, "Client introuvable")]
    CustomerNotFound,

    /// <summary>
    /// Le nom est obligatoire
    /// </summary>
    [ApiErrorInfo(400, "Le nom est obligatoire")]
    CustomerLastNameRequired,

    /// <summary>
    /// Le prénom est obligatoire
    /// </summary>
    [ApiErrorInfo(400, "Le prénom est obligatoire")]
    CustomerFirstNameRequired,

    /// <summary>
    /// Format d'email invalide
    /// </summary>
    [ApiErrorInfo(400, "Format d'email invalide")]
    CustomerInvalidEmail,

    // Quotes

    /// <summary>
    /// Devis introuvable
    /// </summary>
    [ApiErrorInfo(404, "Devis introuvable")]
    QuoteNotFound,

    /// <summary>
    /// Le client est obligatoire
    /// </summary>
    [ApiErrorInfo(400, "Le client est obligatoire")]
    QuoteCustomerRequired,

    /// <summary>
    /// L'objet du devis est obligatoire
    /// </summary>
    [ApiErrorInfo(400, "L'objet du devis est obligatoire")]
    QuoteSubjectRequired,

    /// <summary>
    /// Client introuvable pour ce devis
    /// </summary>
    [ApiErrorInfo(400, "Client introuvable pour ce devis")]
    QuoteCustomerNotFound,

    /// <summary>
    /// Transition de statut non autorisée
    /// </summary>
    [ApiErrorInfo(400, "Transition de statut non autorisée")]
    QuoteInvalidTransition,

    /// <summary>
    /// Statut invalide
    /// </summary>
    [ApiErrorInfo(400, "Statut invalide")]
    QuoteInvalidStatus,

    /// <summary>
    /// Priorité invalide
    /// </summary>
    [ApiErrorInfo(400, "Priorité invalide")]
    QuoteInvalidPriority,

    /// <summary>
    /// Champ personnalisé obligatoire manquant : {0}
    /// </summary>
    [ApiErrorInfo(400, "Champ personnalisé obligatoire manquant : {0}")]
    CustomFieldRequired,

    /// <summary>
    /// Valeur invalide pour le champ personnalisé '{0}' : {1}
    /// </summary>
    [ApiErrorInfo(400, "Valeur invalide pour le champ personnalisé '{0}' : {1}")]
    CustomFieldInvalidValue,

    /// <summary>
    /// Champ personnalisé inconnu : ID {0}, Label {1}
    /// </summary>
    [ApiErrorInfo(400, "Champ personnalisé inconnu : ID {0}, Label {1}")]
    CustomFieldUnknown,

    /// <summary>
    /// Le champ personnalisé '{0}' ne s'applique pas aux devis
    /// </summary>
    [ApiErrorInfo(400, "Le champ personnalisé '{0}' ne s'applique pas aux devis")]
    CustomFieldNotApplicable,

    // Comments

    /// <summary>
    /// Le contenu du commentaire est obligatoire
    /// </summary>
    [ApiErrorInfo(400, "Le contenu du commentaire est obligatoire")]
    CommentContentRequired,

    /// <summary>
    /// Le commentaire ne peut pas dépasser 2000 caractères
    /// </summary>
    [ApiErrorInfo(400, "Le commentaire ne peut pas dépasser 2000 caractères")]
    CommentContentTooLong,

    /// <summary>
    /// Le type d'entité du commentaire est requis
    /// </summary>
    [ApiErrorInfo(400, "Le type d'entité du commentaire est requis")]
    CommentEntityTypeRequired,

    /// <summary>
    /// L'identifiant d'entité du commentaire est requis
    /// </summary>
    [ApiErrorInfo(400, "L'identifiant d'entité du commentaire est requis")]
    CommentEntityIdRequired,

    /// <summary>
    /// Commentaire introuvable
    /// </summary>
    [ApiErrorInfo(404, "Commentaire introuvable")]
    CommentNotFound,

    /// <summary>
    /// Type d'entité non supporté pour les commentaires
    /// </summary>
    [ApiErrorInfo(400, "Type d'entité non supporté pour les commentaires")]
    CommentEntityTypeNotSupported,

    // Quote Lines

    /// <summary>
    /// Ligne de devis introuvable
    /// </summary>
    [ApiErrorInfo(400, "Ligne de devis introuvable")]
    QuoteLineNotFound,

    /// <summary>
    /// Identifiant de ligne de devis en double
    /// </summary>
    [ApiErrorInfo(400, "Identifiant de ligne de devis en double")]
    QuoteLineDuplicateId,

    // Sites

    [ApiErrorInfo(404, "Chantier introuvable")]
    SiteNotFound,

    [ApiErrorInfo(400, "Le client est obligatoire")]
    SiteCustomerRequired,

    [ApiErrorInfo(400, "L'objet du chantier est obligatoire")]
    SiteSubjectRequired,

    [ApiErrorInfo(400, "L'adresse du chantier est obligatoire")]
    SiteAddressRequired,

    [ApiErrorInfo(400, "Client introuvable pour ce chantier")]
    SiteCustomerNotFound,

    [ApiErrorInfo(400, "Devis introuvable")]
    SiteQuoteNotFound,

    [ApiErrorInfo(400, "Le devis doit être en statut Validé pour créer un chantier")]
    SiteQuoteNotAccepted,

    [ApiErrorInfo(400, "Champ obligatoire manquant pour le chantier : {0}")]
    SiteCustomFieldRequired,

    [ApiErrorInfo(400, "L'objet du chantier ne peut pas dépasser 500 caractères")]
    SiteSubjectTooLong,

    [ApiErrorInfo(400, "L'adresse du chantier ne peut pas dépasser 1000 caractères")]
    SiteAddressTooLong,

    [ApiErrorInfo(400, "Les notes ne peuvent pas dépasser 5000 caractères")]
    SiteNotesTooLong,

    [ApiErrorInfo(400, "La date de fin doit être après la date de début")]
    SiteEndDateBeforeStartDate,

    [ApiErrorInfo(400, "Transition de statut non autorisée pour le chantier")]
    SiteInvalidStatusTransition,

    /// <summary>
    /// Impossible de supprimer ce devis : un chantier y est lié
    /// </summary>
    [ApiErrorInfo(400, "Impossible de supprimer ce devis : un chantier y est lié. Supprimez d'abord le chantier.")]
    QuoteHasLinkedSite,

    // Site Assignments

    [ApiErrorInfo(404, "Ouvrier introuvable pour cette attribution")]
    AssignmentWorkerNotFound,

    [ApiErrorInfo(404, "Chantier introuvable pour cette attribution")]
    AssignmentSiteNotFound,

    [ApiErrorInfo(404, "Attribution introuvable")]
    AssignmentNotFound,

    [ApiErrorInfo(400, "La date de fin doit être après la date de début pour l'attribution")]
    AssignmentInvalidDateRange,

    [ApiErrorInfo(400, "Mode d'attribution invalide (valeurs acceptées : full_duration, date_preset, range_preset, free)")]
    AssignmentInvalidMode,

    [ApiErrorInfo(400, "Les dates de l'attribution sont en dehors de la plage du chantier ({0} - {1})")]
    AssignmentOutsideSiteDateRange,

    [ApiErrorInfo(400, "Le libellé du preset est obligatoire")]
    AssignmentPresetLabelRequired,

    [ApiErrorInfo(400, "Les heures du preset sont invalides (format HH:mm, début < fin)")]
    AssignmentPresetInvalidTime,

    [ApiErrorInfo(400, "L'utilisateur doit avoir le rôle Ouvrier")]
    AssignmentWorkerRoleRequired,

    [ApiErrorInfo(400, "La plage de dates ne peut pas dépasser 365 jours")]
    AssignmentRangeTooLarge,

    [ApiErrorInfo(400, "Impossible de supprimer ce chantier : des ouvriers y sont attribués. Supprimez d'abord les attributions.")]
    SiteHasAssignments,

    [ApiErrorInfo(400, "Attribution en doublon : cet ouvrier est déjà attribué pour toute la durée de ce chantier")]
    AssignmentDuplicateFullDuration,

    [ApiErrorInfo(400, "La liste d'attributions est vide")]
    AssignmentBatchEmpty,
}
