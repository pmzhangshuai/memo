import { Button } from "@usememos/mui";
import { ExternalLinkIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { webhookServiceClient } from "@/grpcweb";
import useCurrentUser from "@/hooks/useCurrentUser";
import { Webhook } from "@/types/proto/api/v1/webhook_service";
import { useTranslate } from "@/utils/i18n";
import showCreateWebhookDialog from "../CreateWebhookDialog";

const listWebhooks = async (user: string) => {
  const { webhooks } = await webhookServiceClient.listWebhooks({
    creator: user,
  });
  return webhooks;
};

const WebhookSection = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);

  useEffect(() => {
    listWebhooks(currentUser.name).then((webhooks) => {
      setWebhooks(webhooks);
    });
  }, []);

  const handleCreateAccessTokenDialogConfirm = async () => {
    const webhooks = await listWebhooks(currentUser.name);
    setWebhooks(webhooks);
  };

  const handleDeleteWebhook = async (webhook: Webhook) => {
    const confirmed = window.confirm(`Are you sure to delete webhook \`${webhook.name}\`? You cannot undo this action.`);
    if (confirmed) {
      await webhookServiceClient.deleteWebhook({ id: webhook.id });
      setWebhooks(webhooks.filter((item) => item.id !== webhook.id));
    }
  };

  return (
    <div className="flex flex-col items-start justify-start w-full mt-6">
      <div className="flex items-center justify-between w-full">
        <div className="flex-auto space-y-1">
          <p className="flex flex-row items-center justify-start font-medium text-gray-700 dark:text-gray-400">
            {t("setting.webhook-section.title")}
          </p>
        </div>
        <div>
          <Button
            color="primary"
            onClick={() => {
              showCreateWebhookDialog(handleCreateAccessTokenDialogConfirm);
            }}
          >
            {t("common.create")}
          </Button>
        </div>
      </div>
      <div className="flow-root w-full mt-2">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle border rounded-lg dark:border-zinc-600">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-zinc-600">
              <thead>
                <tr>
                  <th scope="col" className="px-3 py-2 text-sm font-semibold text-left text-gray-900 dark:text-gray-400">
                    {t("common.name")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-sm font-semibold text-left text-gray-900 dark:text-gray-400">
                    {t("setting.webhook-section.url")}
                  </th>
                  <th scope="col" className="relative px-3 py-2 pr-4">
                    <span className="sr-only">{t("common.delete")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-500">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id}>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap dark:text-gray-400">{webhook.name}</td>
                    <td className="max-w-[200px] px-3 py-2 text-sm text-gray-900 dark:text-gray-400 truncate" title={webhook.url}>
                      {webhook.url}
                    </td>
                    <td className="relative px-3 py-2 text-sm text-right whitespace-nowrap">
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => {
                          handleDeleteWebhook(webhook);
                        }}
                      >
                        <TrashIcon className="w-4 h-auto text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}

                {webhooks.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap dark:text-gray-400" colSpan={3}>
                      {t("setting.webhook-section.no-webhooks-found")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="w-full mt-2">
        <Link
          className="inline-flex flex-row items-center justify-start text-sm text-gray-500 hover:underline hover:text-blue-600"
          to="https://usememos.com/docs/advanced-settings/webhook"
          target="_blank"
        >
          {t("common.learn-more")}
          <ExternalLinkIcon className="inline w-4 h-auto ml-1" />
        </Link>
      </div>
    </div>
  );
};

export default WebhookSection;
