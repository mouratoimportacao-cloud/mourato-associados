import "react";

declare module "react" {
  interface DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS {
    nextServerActionWithResult: (formData: FormData) => Promise<unknown>;
  }
}
