import { Redirect } from "expo-router";

export default function CommunitiesIndex() {
  return (
    <Redirect href="/communities/all_communities" />
  );
}