export const customStyles = {
    control: (base, state) => ({
      ...base,
      background: "rgba(0,0,0,0.05)",
      borderRadius: 25,
      borderColor: state.isFocused ? "#0d6efd" : "#0d6efd",
      boxShadow: state.isFocused ? null : null,
      "&:hover": {
        borderColor: state.isFocused ? "#0d6efd" : "#0d6efd",
        background: "rgba(0,0,0,0.05)",
        color: "white"
      }
    }),
    option: (base, state) => ({
        "&:hover": {
            borderColor: state.isFocused ? "#0d6efd" : "#0d6efd",
            background: "rgba(0,0,0,0.05)",
            color: "white"
          }    
    }),
    menu: base => ({
      ...base,
      borderRadius: 0,
      marginTop: 0
    }),
    menuList: (base, state) => ({
      ...base,
      background: "#0d6efd",
      padding: "0.25rem",
    })
};
