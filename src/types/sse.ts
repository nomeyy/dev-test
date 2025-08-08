export interface IEventHistory {
  time: string;
  message: string;
  connectionId: string;
  status?: boolean;
}

export interface IDropdownInputOption {
  id: string;
  label: string;
  isSelected?: boolean;
}

export interface IDropdownInput {
  options: IDropdownInputOption[];
  onSelect: (id: IDropdownInputOption) => void;
  selected?: IDropdownInputOption;
  className?: string;
}

export interface IApiResponse {
  success: boolean;
  message: string;
  details: {
    type: string;
    target: string;
    eventId: string;
    message: string;
  };
  timestamp: string;
  data?: {
    connectedUserIds?: string[];
  };
}

export interface IMultiSelectDropdown {
  options: IDropdownInputOption[];
  setSelected: React.Dispatch<React.SetStateAction<IDropdownInputOption[]>>;
  selected: IDropdownInputOption[];
  className?: string;
  placeHolder: string;
}

export interface IMessageResponse {
  message:string;
}

