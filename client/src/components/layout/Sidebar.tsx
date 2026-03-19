import { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAddresses } from '@/hooks/useAddresses';
import { useFolders } from '@/contexts/FoldersContext';
import { useAuth } from '@/hooks/useAuth';
import { formatEmailAddress } from '@/utils/formatters';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateFolderModal } from '@/components/address/CreateFolderModal';
import { DeleteFolderModal } from '@/components/address/DeleteFolderModal';
import type { EmailAddress, AddressFolder } from '@/types';

interface SidebarProps {
  onCreateAddress: () => void;
}

// Unfiled drop zone component
function UnfiledDropZone({ isOver, showLabel }: { isOver: boolean; showLabel: boolean }) {
  const { setNodeRef } = useDroppable({ id: 'unfiled-drop' });

  if (!showLabel) {
    return <div ref={setNodeRef} className="h-1" />;
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
        isOver
          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400 ring-inset'
          : 'text-gray-400'
      }`}
    >
      Unfiled
    </div>
  );
}

// Sortable address item
function SortableAddressItem({ address }: { address: EmailAddress }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: address.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <NavLink
        to={`/address/${address.id}`}
        className={({ isActive }) =>
          `block truncate rounded-lg px-3 py-2 text-sm ${
            isActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`
        }
        title={formatEmailAddress(address.local_part, address.domain)}
      >
        {address.display_name || address.local_part}
      </NavLink>
    </div>
  );
}

// Folder section with collapsible addresses
function FolderSection({
  folder,
  addresses,
  isExpanded,
  onToggle,
  onRename,
  onDelete,
  isDropTarget,
}: {
  folder: AddressFolder;
  addresses: EmailAddress[];
  isExpanded: boolean;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  isDropTarget: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `folder-${folder.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-1">
      <div
        className={`group flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
          isDropTarget
            ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset'
            : 'hover:bg-gray-100'
        }`}
        {...attributes}
        {...listeners}
      >
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <svg
            className={`h-3 w-3 shrink-0 text-gray-500 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-700 break-word">
            {folder.name}
          </span>
          <span className="text-xs text-gray-400">{addresses.length}</span>
        </button>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded p-1 text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRename();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-gray-100"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5">
          <SortableContext
            items={addresses.map(a => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {addresses.map((address) => (
              <SortableAddressItem key={address.id} address={address} />
            ))}
          </SortableContext>
          {addresses.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">
              Drop addresses here
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onCreateAddress }: SidebarProps) {
  const { addresses, loading: addressesLoading, moveToFolder, getAddressesByFolder, refetch: refetchAddresses } = useAddresses();
  const { folders, loading: foldersLoading, deleteFolder } = useFolders();
  const { signOut } = useAuth();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AddressFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<AddressFolder | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const loading = addressesLoading || foldersLoading;
  const unfiledAddresses = getAddressesByFolder(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      // Check if dragging an address
      if (!activeIdStr.startsWith('folder-')) {
        // Determine target folder
        let targetFolderId: string | null = null;

        if (overIdStr.startsWith('folder-')) {
          targetFolderId = overIdStr.replace('folder-', '');
        } else if (overIdStr === 'unfiled-drop') {
          targetFolderId = null;
        } else {
          // Dropped on another address - get that address's folder
          const targetAddress = addresses.find(a => a.id === overIdStr);
          if (targetAddress) {
            targetFolderId = targetAddress.folder_id;
          }
        }

        const draggedAddress = addresses.find(a => a.id === activeIdStr);
        if (draggedAddress && draggedAddress.folder_id !== targetFolderId) {
          await moveToFolder(activeIdStr, targetFolderId);
        }
      }
    },
    [addresses, moveToFolder]
  );

  const activeAddress = activeId && !activeId.startsWith('folder-')
    ? addresses.find(a => a.id === activeId)
    : null;

  return (
    <>
      <aside className="flex h-full w-[25rem] flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          <h1 className="text-xl font-semibold text-gray-900">Email Client</h1>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              All Inboxes
            </NavLink>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Addresses
              </h2>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Create folder"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </button>
                <button
                  onClick={onCreateAddress}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Create new address"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="mt-3 space-y-2">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <FolderSection
                      key={folder.id}
                      folder={folder}
                      addresses={getAddressesByFolder(folder.id)}
                      isExpanded={expandedFolders.has(folder.id)}
                      onToggle={() => toggleFolder(folder.id)}
                      onRename={() => setEditingFolder(folder)}
                      onDelete={() => setDeletingFolder(folder)}
                      isDropTarget={
                        activeId !== null &&
                        !activeId.startsWith('folder-') &&
                        overId === `folder-${folder.id}`
                      }
                    />
                  ))}

                  {/* Unfiled addresses */}
                  {(unfiledAddresses.length > 0 || folders.length > 0) && (
                    <div>
                      <UnfiledDropZone
                        isOver={
                          activeId !== null &&
                          !activeId.startsWith('folder-') &&
                          overId === 'unfiled-drop'
                        }
                        showLabel={folders.length > 0}
                      />
                      <SortableContext
                        items={unfiledAddresses.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-0.5">
                          {unfiledAddresses.map((address) => (
                            <SortableAddressItem key={address.id} address={address} />
                          ))}
                        </div>
                      </SortableContext>
                    </div>
                  )}

                  {addresses.length === 0 && folders.length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-500">No addresses yet</p>
                  )}
                </div>

                <DragOverlay>
                  {activeAddress && (
                    <div className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700 shadow-lg">
                      {activeAddress.display_name || activeAddress.local_part}
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </nav>

        <div className="border-t border-gray-200 p-4 space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </NavLink>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <CreateFolderModal
        isOpen={showCreateFolder || !!editingFolder}
        onClose={() => {
          setShowCreateFolder(false);
          setEditingFolder(null);
        }}
        editFolder={editingFolder ? { id: editingFolder.id, name: editingFolder.name } : null}
      />

      {deletingFolder && (
        <DeleteFolderModal
          isOpen={true}
          onClose={() => setDeletingFolder(null)}
          onConfirm={async () => {
            await deleteFolder(deletingFolder.id);
            // Refetch addresses since they're cascade deleted with the folder
            await refetchAddresses();
          }}
          folderName={deletingFolder.name}
          addressCount={getAddressesByFolder(deletingFolder.id).length}
        />
      )}
    </>
  );
}
