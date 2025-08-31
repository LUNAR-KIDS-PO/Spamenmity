import { Plugin, registerPlugin } from 'enmity/plugins';
import { create } from 'enmity/patcher';
import { Messages, React } from 'enmity/metro/common';
import { getIDByName } from 'enmity/api/native';

const Patcher = create('spam-plugin');

// Fonction pour attendre un certain temps (en millisecondes)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Variable globale pour contrôler le spam en cours
let isSpamming = false;

const SpamPlugin = {
  name: "SpamPlugin",
  version: "1.3.0",
  description: "Ajoute une commande /spam pour répéter un message ou une pièce jointe (image, fichier) un certain nombre de fois, avec /stop pour arrêter.",
  authors: [{ name: "AutoSpam", id: "unknown" }],

  commands: [
    {
      name: "spam",
      description: "Spam un message ou une pièce jointe un certain nombre de fois",
      options: [
        {
          name: "message",
          description: "Le message ou mot à spammer (optionnel si attachment_url est fourni)",
          type: 3, // Type string
          required: false,
        },
        {
          name: "count",
          description: "Nombre de fois à répéter (prudence avec les règles de Discord)",
          type: 4, // Type integer
          required: true,
        },
        {
          name: "attachment_url",
          description: "URL d'une image ou fichier à spammer (optionnel)",
          type: 3, // Type string
          required: false,
        },
        {
          name: "local_file",
          description: "Chemin du fichier local à spammer (appareils jailbreakés uniquement, optionnel)",
          type: 3, // Type string
          required: false,
        },
      ],

      async execute(args, command) {
        // Récupérer automatiquement l'ID de l'utilisateur actuel
        const userId = getIDByName('User').id;

        // Vérifier si l'utilisateur est autorisé
        if (userId !== getIDByName('User').id) {
          Messages.sendMessage(command.channel_id, {
            content: "❌ Cette commande est réservée à l'utilisateur actuel !",
          });
          return;
        }

        // Récupérer les arguments
        const message = args.find(arg => arg.name === "message")?.value || "";
        const attachmentUrl = args.find(arg => arg.name === "attachment_url")?.value || "";
        const localFile = args.find(arg => arg.name === "local_file")?.value || "";
        const count = parseInt(args.find(arg => arg.name === "count")?.value || "1");

        // Vérifier que le nombre est valide
        if (isNaN(count) || count < 1) {
          Messages.sendMessage(command.channel_id, {
            content: "❌ Veuillez fournir un nombre valide (1 ou plus).",
          });
          return;
        }

        // Vérifier qu'au moins un message, une URL ou un fichier local est fourni
        if (!message && !attachmentUrl && !localFile) {
          Messages.sendMessage(command.channel_id, {
            content: "❌ Fournissez au moins un message, une URL d'attachment ou un chemin de fichier local.",
          });
          return;
        }

        // Gérer les fichiers locaux (appareils jailbreakés uniquement)
        let finalAttachmentUrl = attachmentUrl;
        if (localFile) {
          try {
            // Note : L'accès direct aux fichiers locaux n'est pas nativement pris en charge par Enmity sans jailbreak
            // Pour les appareils jailbreakés, supposons que le fichier est accessible via un chemin comme /var/mobile/...
            // Cette partie nécessite une implémentation spécifique pour uploader le fichier via l'API de Discord
            Messages.sendMessage(command.channel_id, {
              content: "⚠️ Fonctionnalité de fichier local non pleinement supportée sans jailbreak. Veuillez fournir une URL ou uploader le fichier manuellement.",
            });
            // Hypothétique : Uploader le fichier local via une API Discord personnalisée (non implémenté ici)
            // Pour contourner, demander à l'utilisateur d'uploader manuellement et de fournir l'URL
            return;
          } catch (error) {
            Messages.sendMessage(command.channel_id, {
              content: `❌ Erreur lors de l'accès au fichier local : ${error.message}`,
            });
            return;
          }
        }

        // Valider l'URL de l'attachment (si fournie)
        if (attachmentUrl) {
          const isValidUrl = attachmentUrl.match(/\.(jpeg|jpg|png|gif|mp4|webm)$/i);
          if (!isValidUrl) {
            Messages.sendMessage(command.channel_id, {
              content: "❌ L'URL de l'attachment doit pointer vers une image ou un fichier valide (jpg, png, gif, mp4, webm).",
            });
            return;
          }
        }

        // Démarrer le spam
        isSpamming = true;
        Messages.sendMessage(command.channel_id, {
          content: `✅ Début du spam pour ${count} fois. Utilisez /stop pour arrêter.`,
        });

        for (let i = 0; i < count && isSpamming; i++) {
          try {
            // Préparer le message avec embed si attachment_url est fourni
            const embeds = finalAttachmentUrl ? [{
              type: "image",
              url: finalAttachmentUrl,
            }] : [];

            Messages.sendMessage(command.channel_id, {
              content: message,
              embeds: embeds,
            });

            // Pas de délai initial pour spam ultra rapide
          } catch (error) {
            // Si erreur (par exemple, rate limit), attendre 5 secondes et retry
            Messages.sendMessage(command.channel_id, {
              content: `⚠️ Erreur détectée (possible rate limit). Attente de 5 secondes avant retry...`,
            });
            await sleep(5000);
            i--; // Retry cette itération
          }
        }

        if (isSpamming) {
          Messages.sendMessage(command.channel_id, {
            content: `✅ Spam terminé pour "${message || finalAttachmentUrl}" ${count} fois !`,
          });
        } else {
          Messages.sendMessage(command.channel_id, {
            content: `🛑 Spam arrêté manuellement.`,
          });
        }

        isSpamming = false;
      },
    },
    {
      name: "stop",
      description: "Arrête le spam en cours",
      options: [],

      async execute(args, command) {
        // Récupérer automatiquement l'ID de l'utilisateur actuel
        const userId = getIDByName('User').id;

        // Vérifier si l'utilisateur est autorisé
        if (userId !== getIDByName('User').id) {
          Messages.sendMessage(command.channel_id, {
            content: "❌ Cette commande est réservée à l'utilisateur actuel !",
          });
          return;
        }

        if (isSpamming) {
          isSpamming = false;
          Messages.sendMessage(command.channel_id, {
            content: "🛑 Spam arrêté !",
          });
        } else {
          Messages.sendMessage(command.channel_id, {
            content: "ℹ️ Aucun spam en cours.",
          });
        }
      },
    },
  ],

  onStart() {
    // Initialiser la variable
    isSpamming = false;
  },

  onStop() {
    Patcher.unpatchAll();
    isSpamming = false;
  },
};

registerPlugin(SpamPlugin);
