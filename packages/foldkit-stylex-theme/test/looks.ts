// Each look through its component's XStyle.view, checked by `typecheck`: a look that sets a
// property @foldkit/ui writes inline or the core owns fails here with the core's message. Looks are
// imported through the package's subpaths, as an app imports them.
import {
  Animation,
  Button,
  Calendar,
  Checkbox,
  Combobox,
  DatePicker,
  Dialog,
  Disclosure,
  DragAndDrop,
  Fieldset,
  FileDrop,
  HoverIntent,
  Input,
  Listbox,
  Menu,
  Meter,
  Nav,
  Popover,
  Progress,
  RadioGroup,
  Select,
  Slider,
  Switch,
  Tabs,
  Textarea,
  Toast,
  Tooltip,
  VirtualList,
} from "@foldkit/ui";
import {
  AnimationStyle,
  ButtonStyle,
  CalendarStyle,
  CheckboxStyle,
  ComboboxStyle,
  DatePickerStyle,
  DialogStyle,
  DisclosureStyle,
  DragAndDropStyle,
  FieldsetStyle,
  FileDropStyle,
  HoverIntentStyle,
  InputStyle,
  ListboxStyle,
  MenuStyle,
  MeterStyle,
  NavStyle,
  PopoverStyle,
  ProgressStyle,
  RadioGroupStyle,
  SelectStyle,
  SliderStyle,
  SwitchStyle,
  TabsStyle,
  TextareaStyle,
  ToastStyle,
  TooltipStyle,
  VirtualListStyle,
} from "@kutur-kit/foldkit-stylex";
import { animationTheme } from "@kutur-kit/foldkit-stylex-theme/animation";
import { buttonTheme } from "@kutur-kit/foldkit-stylex-theme/button";
import { calendarTheme } from "@kutur-kit/foldkit-stylex-theme/calendar";
import { checkboxTheme } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import { comboboxTheme } from "@kutur-kit/foldkit-stylex-theme/combobox";
import { datePickerTheme } from "@kutur-kit/foldkit-stylex-theme/date-picker";
import { dialogTheme } from "@kutur-kit/foldkit-stylex-theme/dialog";
import { disclosureTheme } from "@kutur-kit/foldkit-stylex-theme/disclosure";
import { dragAndDropTheme } from "@kutur-kit/foldkit-stylex-theme/drag-and-drop";
import { fieldsetTheme } from "@kutur-kit/foldkit-stylex-theme/fieldset";
import { fileDropTheme } from "@kutur-kit/foldkit-stylex-theme/file-drop";
import { hoverIntentTheme } from "@kutur-kit/foldkit-stylex-theme/hover-intent";
import { inputTheme } from "@kutur-kit/foldkit-stylex-theme/input";
import { listboxTheme } from "@kutur-kit/foldkit-stylex-theme/listbox";
import { menuTheme } from "@kutur-kit/foldkit-stylex-theme/menu";
import { meterTheme } from "@kutur-kit/foldkit-stylex-theme/meter";
import { navTheme } from "@kutur-kit/foldkit-stylex-theme/nav";
import { popoverTheme } from "@kutur-kit/foldkit-stylex-theme/popover";
import { progressTheme } from "@kutur-kit/foldkit-stylex-theme/progress";
import { radioGroupTheme } from "@kutur-kit/foldkit-stylex-theme/radio-group";
import { selectTheme } from "@kutur-kit/foldkit-stylex-theme/select";
import { sliderTheme } from "@kutur-kit/foldkit-stylex-theme/slider";
import { switchTheme } from "@kutur-kit/foldkit-stylex-theme/switch";
import { tabsTheme } from "@kutur-kit/foldkit-stylex-theme/tabs";
import { textareaTheme } from "@kutur-kit/foldkit-stylex-theme/textarea";
import { toastTheme } from "@kutur-kit/foldkit-stylex-theme/toast";
import { tooltipTheme } from "@kutur-kit/foldkit-stylex-theme/tooltip";
import { virtualListTheme } from "@kutur-kit/foldkit-stylex-theme/virtual-list";
import { Schema } from "effect";

const Sections = Tabs.create<"Poems" | "Notes">();

const Languages = Listbox.create<"pl" | "en">();

const Tags = Listbox.Multi.create<"a" | "b">();

const Cities = Combobox.create<"Kraków" | "Łódź">();

const Towns = Combobox.Multi.create<"Hel" | "Puck">();

const Actions = Menu.create<"Copy" | "Delete">();

const Plans = RadioGroup.create<"Free" | "Pro">();

const Notices = Toast.make(Schema.Struct({ text: Schema.String }));

export const animationView = AnimationStyle.view(Animation.view, animationTheme);

export const buttonView = ButtonStyle.view(Button.view, buttonTheme);

export const calendarView = CalendarStyle.view(Calendar.view, calendarTheme);

export const checkboxView = CheckboxStyle.view(Checkbox.view, checkboxTheme);

export const comboboxView = ComboboxStyle.view(Cities.view, comboboxTheme);

export const townsView = ComboboxStyle.Multi.view(Towns.view, comboboxTheme);

export const datePickerView = DatePickerStyle.view(DatePicker.view, datePickerTheme);

export const dialogView = DialogStyle.view(Dialog.view, dialogTheme);

export const disclosureView = DisclosureStyle.view(Disclosure.view, disclosureTheme);

export const dragAndDropDraggable = DragAndDropStyle.draggable(
  DragAndDrop.draggable,
  dragAndDropTheme,
);

export const fieldsetView = FieldsetStyle.view(Fieldset.view, fieldsetTheme);

export const fileDropView = FileDropStyle.view(FileDrop.view, fileDropTheme);

export const hoverIntentView = HoverIntentStyle.view(HoverIntent.view, hoverIntentTheme);

export const inputView = InputStyle.view(Input.view, inputTheme);

export const listboxView = ListboxStyle.view(Languages.view, listboxTheme);

export const tagsView = ListboxStyle.Multi.view(Tags.view, listboxTheme);

export const menuView = MenuStyle.view(Actions.view, menuTheme);

export const meterView = MeterStyle.view(Meter.view, meterTheme);

export const navView = NavStyle.view(Nav.view, navTheme);

export const popoverView = PopoverStyle.view(Popover.view, popoverTheme);

export const progressView = ProgressStyle.view(Progress.view, progressTheme);

export const radioGroupView = RadioGroupStyle.view(Plans.view, radioGroupTheme);

export const selectView = SelectStyle.view(Select.view, selectTheme);

export const sliderView = SliderStyle.view(Slider.view, sliderTheme);

export const switchView = SwitchStyle.view(Switch.view, switchTheme);

export const tabsView = TabsStyle.view(Sections.view, tabsTheme);

export const textareaView = TextareaStyle.view(Textarea.view, textareaTheme);

export const toastView = ToastStyle.view(Notices.view, toastTheme);

export const tooltipView = TooltipStyle.view(Tooltip.view, tooltipTheme);

export const virtualListView = VirtualListStyle.view(VirtualList.view<string>(), virtualListTheme);
