'use client';

/**
 * Menu management list page. Presents the navigation hierarchy per location (Header / Footer /
 * Utility) in tabs, each rendering the backend tree with reorder/activate/edit/delete controls.
 * The backend remains the source of truth for the hierarchy; the frontend only displays it and
 * persists changes through the API. Loading / empty / error states from shared infrastructure.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Plus, MenuSquare } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/feedback/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Can } from '@/components/auth';
import { ROUTES } from '@/constants/routes';
import { MENU_LOCATIONS, MENU_LOCATION_LABEL, type MenuLocation } from './types';
import { MENU_PERMS } from './api';
import { useMenuItems } from './hooks';
import { MenuTreeView } from './components/menu-tree-view';

export function MenuListPage() {
  const [location, setLocation] = useState<MenuLocation>('header');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menus"
        description="Configure the Header, Footer, and Utility navigation. Drag is not used — reorder with the up/down controls; the backend owns the hierarchy."
        actions={
          <Can permission={MENU_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.menus}/new?location=${location}`}>New menu item</Link>
            </Button>
          </Can>
        }
      />

      <Tabs defaultValue="header" value={location} onValueChange={(v) => setLocation(v as MenuLocation)}>
        <TabsList>
          {MENU_LOCATIONS.map((l) => (
            <TabsTrigger key={l} value={l}>
              {MENU_LOCATION_LABEL[l]}
            </TabsTrigger>
          ))}
        </TabsList>
        {MENU_LOCATIONS.map((l) => (
          <TabsContent key={l} value={l}>
            <LocationPanel location={l} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LocationPanel({ location }: { location: MenuLocation }) {
  const list = useMenuItems(location);

  if (list.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (list.isError) {
    return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  }

  const items = list.data ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={MenuSquare}
          title={`No ${MENU_LOCATION_LABEL[location]} menu items`}
          description="Add the first item for this menu location to get started."
          action={
            <Can permission={MENU_PERMS.create}>
              <Button asChild size="sm">
                <Link href={`${ROUTES.menus}/new?location=${location}`}>New menu item</Link>
              </Button>
            </Can>
          }
        />
      </Card>
    );
  }

  return <MenuTreeView items={items} />;
}
