import GuestHome from "../components/home/GuestHome";
import UserHome from "../components/home/UserHome";
import { createClient } from "../lib/supabase/server";
import type { User } from "@supabase/supabase-js";

type UserHomeProps = {
  user: User;
};

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GuestHome />;
  }

  return <UserHome/>;
}