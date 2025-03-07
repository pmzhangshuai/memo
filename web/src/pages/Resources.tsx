import { Divider, Tooltip } from "@mui/joy";
import { Button, Input } from "@usememos/mui";
import dayjs from "dayjs";
import { includes } from "lodash-es";
import { PaperclipIcon, SearchIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Empty from "@/components/Empty";
import MobileHeader from "@/components/MobileHeader";
import ResourceIcon from "@/components/ResourceIcon";
import { resourceServiceClient } from "@/grpcweb";
import useCurrentUser from "@/hooks/useCurrentUser";
import useLoading from "@/hooks/useLoading";
import i18n from "@/i18n";
import { useMemoStore, useResourceStore } from "@/store/v1";
import { Resource } from "@/types/proto/api/v1/resource_service";
import { useTranslate } from "@/utils/i18n";
import { useLocation } from "react-router-dom";

function groupResourcesByDate(resources: Resource[]) {
  const grouped = new Map<string, Resource[]>();
  resources
    .sort((a, b) => dayjs(b.createTime).unix() - dayjs(a.createTime).unix())
    .forEach((item) => {
      const monthStr = dayjs(item.createTime).format("YYYY-MM");
      if (!grouped.has(monthStr)) {
        grouped.set(monthStr, []);
      }
      grouped.get(monthStr)?.push(item);
    });
  return grouped;
}

interface State {
  searchQuery: string;
}

interface Props {
  owner?: string;
}

const Resources = (props: Props) => {
  const t = useTranslate();
  const loadingState = useLoading();
  const [state, setState] = useState<State>({
    searchQuery: "",
  });
  const memoStore = useMemoStore();
  const [resources, setResources] = useState<Resource[]>([]);
  const filteredResources = resources.filter((resource) => includes(resource.filename, state.searchQuery));
  const groupedResources = groupResourcesByDate(filteredResources.filter((resource) => resource.memo));
  const unusedResources = filteredResources.filter((resource) => !resource.memo);

  useEffect(() => {
    // console.log("fetching resources:", props.owner);
    resourceServiceClient.listResources({ parent: props.owner || "" }).then(({ resources }) => {
      setResources(resources);
      loadingState.setFinish();
      Promise.all(resources.map((resource) => (resource.memo ? memoStore.getOrFetchMemoByName(resource.memo) : null)));
    });
    // useResourceStore().fetchResourceByName
  }, []);

  const handleDeleteUnusedResources = async () => {
    const confirmed = window.confirm("Are you sure to delete all unused resources? This action cannot be undone.");
    if (confirmed) {
      for (const resource of unusedResources) {
        await resourceServiceClient.deleteResource({ name: resource.name });
      }
      setResources(resources.filter((resource) => resource.memo));
    }
  };

  const { state: locationState } = useLocation();
  const currentUser = useCurrentUser();
  return (
    <>
      <section className="@container w-full max-w-5xl min-h-full flex flex-col justify-start items-center">
        {/* <MobileHeader /> */}
        <div className="w-full">
          <div className="flex flex-col items-start justify-start w-full px-4 py-3 text-black bg-white shadow rounded-xl dark:bg-zinc-800 dark:text-gray-300">
            {/* <div className="relative flex flex-row items-center justify-between w-full">
            <p className="flex flex-row items-center justify-start py-1 select-none opacity-80">
              <PaperclipIcon className="w-6 h-auto mr-1 opacity-80" />
              <span className="text-lg">{t("common.resources")}</span>
            </p>
            <div>
              <Input
                className="max-w-[8rem]"
                placeholder={t("common.search")}
                startDecorator={<SearchIcon className="w-4 h-auto" />}
                value={state.searchQuery}
                onChange={(e) => setState({ ...state, searchQuery: e.target.value })}
              />
            </div>
          </div> */}
            <div className="flex flex-col items-start justify-start w-full mt-4 mb-6">
              {loadingState.isLoading ? (
                <div className="flex flex-col items-center justify-center w-full h-32">
                  <p className="w-full my-6 mt-8 text-base text-center">{t("resource.fetching-data")}</p>
                </div>
              ) : (
                <>
                  {filteredResources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full mt-8 mb-8 italic">
                      <Empty />
                      <p className="mt-4 text-gray-600 dark:text-gray-400">{t("message.no-data")}</p>
                    </div>
                  ) : (
                    <div className={"w-full h-auto px-2 flex flex-col justify-start items-start gap-y-8"}>
                      {Array.from(groupedResources.entries()).map(([monthStr, resources]) => {
                        return (
                          <div key={monthStr} className="flex flex-row items-start justify-start w-full">
                            <div className="flex flex-col items-start justify-start w-16 pt-4 sm:w-24 sm:pl-4">
                              <span className="text-sm opacity-60">{dayjs(monthStr).year()}</span>
                              <span className="text-xl font-medium">
                                {dayjs(monthStr).toDate().toLocaleString(i18n.language, { month: "short" })}
                              </span>
                            </div>
                            <div className="w-full max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-6rem)] flex flex-row justify-start items-start gap-4 flex-wrap">
                              {resources.map((resource) => {
                                return (
                                  <div key={resource.name} className="flex flex-col items-start justify-start w-24 h-auto sm:w-32">
                                    <div className="flex items-center justify-center w-24 h-24 border cursor-pointer sm:w-32 sm:h-32 dark:border-zinc-900 overflow-clip rounded-xl hover:shadow hover:opacity-80">
                                      <ResourceIcon resource={resource} strokeWidth={0.5} />
                                    </div>
                                    <div className="flex flex-row items-center justify-between w-full max-w-full px-1 mt-1">
                                      <p className="text-xs text-gray-400 truncate shrink">{resource.filename}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {props.owner === currentUser?.name && unusedResources.length > 0 && (
                        <>
                          <Divider />
                          <div className="flex flex-row items-start justify-start w-full">
                            <div className="flex flex-col items-start justify-start w-16 sm:w-24 sm:pl-4"></div>
                            <div className="w-full max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-6rem)] flex flex-row justify-start items-start gap-4 flex-wrap">
                              <div className="flex flex-row items-center justify-start w-full gap-2">
                                <span className="text-gray-600 dark:text-gray-400">Unused resources</span>
                                <span className="text-gray-500 dark:text-gray-500 opacity-80">({unusedResources.length})</span>
                                <Tooltip title="Delete all" placement="top">
                                  <Button size="sm" variant="plain" onClick={handleDeleteUnusedResources}>
                                    <TrashIcon className="w-4 h-auto opacity-60" />
                                  </Button>
                                </Tooltip>
                              </div>
                              {unusedResources.map((resource) => {
                                return (
                                  <div key={resource.name} className="flex flex-col items-start justify-start w-24 h-auto sm:w-32">
                                    <div className="flex items-center justify-center w-24 h-24 border cursor-pointer sm:w-32 sm:h-32 dark:border-zinc-900 overflow-clip rounded-xl hover:shadow hover:opacity-80">
                                      <ResourceIcon resource={resource} strokeWidth={0.5} />
                                    </div>
                                    <div className="flex flex-row items-center justify-between w-full max-w-full px-1 mt-1">
                                      <p className="text-xs text-gray-400 truncate shrink">{resource.filename}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Resources;
